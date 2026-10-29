"""Multilingual meaning-based matching for complaint text.

Why this exists: officers receive complaints written in English, Hindi or Marathi. Matching them by
hand-written keyword lists only works for one language. Instead a small multilingual sentence model
turns each complaint into a vector of "meaning", so "Lab machines are broken" and
"प्रयोगशाला की मशीनें खराब हैं" land close together without any language-specific rules.

Design goals (so it can never hurt the website):
  * Local ONNX model via fastembed (about 220 MB on disk, runs on CPU, no GPU, no PyTorch, no API key).
  * Loaded ONCE in a background thread. Requests never wait for it: if it is not ready, the caller
    gets None and the basic text matcher is used for that request.
  * A failed load is remembered and retried only every few minutes, never on every request.
  * Every complaint is embedded once and cached in the database (ComplaintEmbedding).
  * Nothing here can raise into a request: all failures degrade to None.
"""
import hashlib
import logging
import math
import threading
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings

log = logging.getLogger("aicte.semantic")
MAX_CHARS = 1000  # the model only reads the first ~128 tokens anyway

_lock = threading.Lock()
_state = {"status": "idle", "model": None, "error": "", "retry_at": 0.0, "loaded_at": None}


def _load() -> None:
    """Runs in a background thread."""
    try:
        from fastembed import TextEmbedding  # optional dependency
        model = TextEmbedding(model_name=settings.embedding_model, cache_dir=settings.model_cache_dir, threads=1)
        list(model.embed(["warm-up"]))  # first call initialises the ONNX session
        with _lock:
            _state.update(status="ready", model=model, error="", loaded_at=time.time())
        log.info("Multilingual model ready: %s", settings.embedding_model)
    except Exception as e:  # noqa: BLE001 - any failure means "use the basic matcher"
        with _lock:
            _state.update(status="unavailable", model=None, error=f"{type(e).__name__}: {e}"[:300],
                          retry_at=time.time() + settings.semantic_retry_minutes * 60)
        log.warning("Multilingual model unavailable, using basic matching: %s", e)


def warm_up() -> None:
    """Start loading in the background if not already loaded / loading / cooling down."""
    if not settings.semantic_enabled:
        return
    with _lock:
        st = _state["status"]
        if st in ("loading", "ready") or (st == "unavailable" and time.time() < _state["retry_at"]):
            return
        _state["status"] = "loading"
    threading.Thread(target=_load, name="semantic-loader", daemon=True).start()


def ready() -> bool:
    return settings.semantic_enabled and _state["status"] == "ready"


def status() -> dict:
    if not settings.semantic_enabled:
        return {"engine": "basic", "state": "disabled", "model": None, "detail": "Multilingual matching is switched off in settings."}
    st = _state["status"]
    if st == "ready":
        return {"engine": "multilingual-ai", "state": "ready", "model": settings.embedding_model, "detail": ""}
    return {"engine": "basic", "state": st, "model": settings.embedding_model, "detail": _state["error"]}


def embed(texts: list[str]) -> list[list[float]] | None:
    """Unit-length vectors for the texts, or None when the model is not ready (never raises, never waits)."""
    if not settings.semantic_enabled or not texts:
        return None
    if _state["status"] != "ready":
        warm_up()  # kicks off (or retries) the background load; this request uses the basic matcher
        return None
    try:
        out = []
        for v in _state["model"].embed([t[:MAX_CHARS] for t in texts]):
            v = [float(x) for x in v]
            n = math.sqrt(sum(x * x for x in v)) or 1.0
            out.append([x / n for x in v])
        return out
    except Exception as e:  # noqa: BLE001
        log.warning("Embedding failed, using basic matching for this request: %s", e)
        return None


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def strength(cos: float) -> float:
    """Map a raw cosine to 0..1 'how likely the same issue'. Unrelated text sits near/below the floor."""
    lo, hi = settings.semantic_floor, settings.semantic_ceiling
    return max(0.0, min(1.0, (cos - lo) / (hi - lo)))


def _text_of(c) -> str:
    return f"{c.subject}. {c.description}".strip()


def vectors_for(db: Session, complaints: list) -> dict[int, list[float]]:
    """{complaint_id: vector} for every complaint, embedding and caching any that are missing.
    Returns {} if the model is not ready, so callers fall back to basic matching."""
    from ..models import ComplaintEmbedding
    if not complaints or not ready():
        return {}
    ids = [c.id for c in complaints]
    cached = {e.complaint_id: e for e in db.scalars(select(ComplaintEmbedding).where(ComplaintEmbedding.complaint_id.in_(ids)))}
    result, todo = {}, []
    for c in complaints:
        text = _text_of(c)
        h = hashlib.sha1(text.encode("utf-8")).hexdigest()
        e = cached.get(c.id)
        if e and e.text_hash == h and e.model == settings.embedding_model:
            result[c.id] = e.vector
        else:
            todo.append((c, text, h))
    if todo:
        vecs = embed([t for _, t, _ in todo])
        if vecs is None:
            return {}  # model went away mid-way: basic matcher for this request
        for (c, _, h), v in zip(todo, vecs):
            row = cached.get(c.id)
            if row:
                row.model, row.text_hash, row.vector = settings.embedding_model, h, v
            else:
                db.add(ComplaintEmbedding(complaint_id=c.id, model=settings.embedding_model, text_hash=h, vector=v))
            result[c.id] = v
        db.flush()
    return result