"""Multilingual meaning-based matching for complaint text.

Cloud-based inference using Google Gemini Embeddings (text-embedding-004):
  * Zero RAM footprint on the server (no heavy local ONNX/PyTorch models).
  * High-quality multilingual embeddings across English, Hindi, Marathi, and 100+ languages.
  * Embeddings are cached in the database (ComplaintEmbedding) so each complaint is only embedded once.
  * If GEMINI_API_KEY is not set or network fails, gracefully falls back to pure Python TF-IDF rules.
"""
import hashlib
import logging
import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings

log = logging.getLogger("aicte.semantic")
MAX_CHARS = 1000
GEMINI_MODEL = "gemini-text-embedding-004"


def warm_up() -> None:
    """No local model download required when using cloud API."""
    pass


def ready() -> bool:
    """Ready when semantic matching is enabled and a Gemini API key is configured."""
    return bool(settings.semantic_enabled and settings.gemini_api_key)


def status() -> dict:
    if not settings.semantic_enabled:
        return {
            "engine": "basic",
            "state": "disabled",
            "model": None,
            "detail": "Semantic matching is disabled in settings."
        }
    if settings.gemini_api_key:
        return {
            "engine": "multilingual-ai",
            "state": "ready",
            "model": "Google Gemini (text-embedding-004)",
            "detail": ""
        }
    return {
        "engine": "rules+tfidf",
        "state": "ready",
        "model": "Rule & Keyword Matching",
        "detail": "Zero-RAM rule matching active. Add GEMINI_API_KEY for multilingual AI embeddings."
    }


def embed(texts: list[str]) -> list[list[float]] | None:
    """Unit-length vectors using Google Gemini text-embedding-004 API."""
    if not settings.semantic_enabled or not settings.gemini_api_key or not texts:
        return None
    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={settings.gemini_api_key}"
        requests_payload = [
            {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": t[:MAX_CHARS]}]}
            }
            for t in texts
        ]
        resp = httpx.post(url, json={"requests": requests_payload}, timeout=12.0)
        if resp.status_code == 200:
            data = resp.json()
            out = []
            for item in data.get("embeddings", []):
                v = [float(x) for x in item.get("values", [])]
                n = math.sqrt(sum(x * x for x in v)) or 1.0
                out.append([x / n for x in v])
            return out
        log.warning("Gemini API error %s: %s", resp.status_code, resp.text[:200])
        return None
    except Exception as e:
        log.warning("Gemini embedding call failed: %s", e)
        return None


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def strength(cos: float) -> float:
    """Map a raw cosine to 0..1 'how likely the same issue'."""
    lo, hi = settings.semantic_floor, settings.semantic_ceiling
    return max(0.0, min(1.0, (cos - lo) / (hi - lo)))


def _text_of(c) -> str:
    return f"{c.subject}. {c.description}".strip()


def vectors_for(db: Session, complaints: list) -> dict[int, list[float]]:
    """{complaint_id: vector} for complaints, embedding and caching via Gemini API."""
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
        if e and e.text_hash == h and e.model == GEMINI_MODEL:
            result[c.id] = e.vector
        else:
            todo.append((c, text, h))
    if todo:
        vecs = embed([t for _, t, _ in todo])
        if vecs is None:
            return {}  # Fall back to basic matcher for this request
        for (c, _, h), v in zip(todo, vecs):
            row = cached.get(c.id)
            if row:
                row.model, row.text_hash, row.vector = GEMINI_MODEL, h, v
            else:
                db.add(ComplaintEmbedding(complaint_id=c.id, model=GEMINI_MODEL, text_hash=h, vector=v))
            result[c.id] = v
        db.flush()
    return result
