"""Potential-overlap detection.

Hard gate: same institution (by stable institution ID). Then rule signals (category, timing)
are combined with text similarity.

Text similarity, in order of preference:
  1. MEANING similarity from a small multilingual model (services/semantic.py). Works across English,
     Hindi and Marathi (even an English complaint vs a Marathi one) with no hand-written word lists.
  2. If the model is not available (not installed, not downloaded, still loading), a basic lexical
     matcher (TF-IDF over words, including Devanagari words) keeps the system working.
Suggestions are never merged or closed automatically.
"""
import math
import re
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import CaseLink, Complaint
from . import config_svc, semantic

STOP = set("""the and for are not with has have that this from without they their was were been into over
 many much very some any all can will would should could also still more most other than then them these those
 its our out off about after before during while where when which who whom what why how there here such only
 own same too just""".split())

CONCEPTS = {
    "lab/equipment": "lab labs laboratory laboratories workshop workshops equipment machine machines machinery apparatus instrument instruments computers computer tools devices",
    "broken/outdated": "broken faulty damaged outdated defective nonfunctional malfunctioning unusable obsolete repair unsafe missing",
    "hostel": "hostel hostels dormitory dormitories accommodation residence mess",
    "water/sanitation": "water drinking sanitation washroom washrooms toilet toilets restroom hygiene",
    "fees": "fee fees tuition charges charged payment refund refunds donation capitation collecting collected",
    "library": "library libraries books journals reading",
    "faculty": "faculty teachers teacher professors professor lecturers lecturer staff teaching",
    "salary": "salary salaries wages wage unpaid pay payment pending",
    "qualification": "qualified unqualified qualification qualifications eligibility",
    "approval": "approval approved unapproved affiliation affiliated recognition recognised sanctioned intake permission",
    "admission": "admission admissions seats seat enrolment enrollment admitted",
    "campus": "infrastructure building buildings classroom classrooms facilities campus",
}
WORD2CONCEPT = {w: c for c, ws in CONCEPTS.items() for w in ws.split()}


def _stem(w: str) -> str:
    for suf in ("ing", "ed", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 4:
            return w[: -len(suf)]
    return w


# Most frequent Hindi/Marathi function words (basic matcher only; the AI model needs no such list)
DEV_STOP = set("है हैं था थी थे का की के को में से पर और या भी यह वह एक नहीं कि है। आहे आहेत नाही चा ची चे ला ना मध्ये आणि किंवा हे ते या".split())


def tokens(text: str) -> list[str]:
    out = []
    for w in re.findall(r"[a-z]+|[\u0900-\u097F]+", text.lower()):
        if "\u0900" <= w[0] <= "\u097F":  # Devanagari word (Hindi / Marathi)
            if w not in DEV_STOP and len(w) >= 2:
                out.append(w)
            continue
        if w in STOP or len(w) < 3:
            continue
        out.append(WORD2CONCEPT.get(w) or WORD2CONCEPT.get(_stem(w)) or _stem(w))
    return out


class Similarity:
    def __init__(self, corpus: list[str]):
        docs = [set(tokens(t)) for t in corpus] or [set()]
        n = len(docs)
        df = Counter(tok for d in docs for tok in d)
        self.idf = {t: math.log((1 + n) / (1 + c)) + 1 for t, c in df.items()}
        self.default_idf = math.log(1 + n) + 1

    def _vec(self, text: str) -> dict:
        tf = Counter(tokens(text))
        return {t: c * self.idf.get(t, self.default_idf) for t, c in tf.items()}

    def similarity(self, a: str, b: str) -> tuple[float, list[str]]:
        va, vb = self._vec(a), self._vec(b)
        dot = sum(va[t] * vb[t] for t in va if t in vb)
        na = math.sqrt(sum(v * v for v in va.values()))
        nb = math.sqrt(sum(v * v for v in vb.values()))
        cos = dot / (na * nb) if na and nb else 0.0
        shared = sorted(set(tokens(a)) & set(tokens(b)))
        return cos, shared

    method = "rules+tfidf"


def score_pair(a: dict, b: dict, sim: Similarity, cfg: dict, sem_cos: float | None = None) -> tuple[float, list[dict]]:
    """a/b: dicts with institution_id, category, subject, description, registered_on, bureau.
    sem_cos: meaning-similarity from the multilingual model, when available (else basic text matching)."""
    signals: list[dict] = []
    if a["institution_id"] != b["institution_id"]:
        return 0.0, []
    score = 0.0
    signals.append({"type": "institution", "label": "Same institution", "detail": f"Both cases concern institution {a['institution_code']}", "weight": 0})
    related = cfg["related_categories"]
    if a["category"] == b["category"]:
        score += 0.25
        signals.append({"type": "category", "label": "Same category", "detail": a["category"], "weight": 0.25})
    elif b["category"] in related.get(a["category"], []):
        score += 0.12
        signals.append({"type": "category", "label": "Related categories", "detail": f"{a['category']} and {b['category']}", "weight": 0.12})
    if sem_cos is not None:
        st = semantic.strength(sem_cos)
        w = round(0.55 * st, 3)
        score += w
        if st >= 0.2:
            signals.append({"type": "text", "label": "Similar meaning", "detail": f"Meaning similarity {st:.0%} (compared by an AI language model; works across English, Hindi and Marathi)", "weight": w})
    else:
        cos, shared = sim.similarity(f"{a['subject']} {a['description']}", f"{b['subject']} {b['description']}")
        if cos > 0:
            w = round(0.55 * cos, 3)
            score += w
            if cos >= 0.2:
                signals.append({"type": "text", "label": "Similar descriptions", "detail": f"Text similarity {cos:.0%}; shared topics: {', '.join(shared[:6]) or 'n/a'}", "weight": w})
    gap = abs((a["registered_on"] - b["registered_on"]).days)
    window = int(cfg["overlap_window_days"])
    if gap <= window:
        w = round(0.10 * (1 - gap / window), 3)
        score += w
        signals.append({"type": "timing", "label": "Close in time", "detail": f"Registered {gap} day(s) apart", "weight": w})
    if a["bureau"] != b["bureau"]:
        signals.append({"type": "bureau", "label": "Handled by different units", "detail": f"{a['bureau']} and {b['bureau']}", "weight": 0})
    return round(min(score, 1.0), 3), signals


def as_dict(c: Complaint) -> dict:
    return {"institution_id": c.institution_id, "institution_code": c.institution.code, "category": c.category,
            "subject": c.subject, "description": c.description, "registered_on": c.registered_on, "bureau": c.bureau.name}


def pair_key(x: int, y: int) -> tuple[int, int]:
    return (x, y) if x < y else (y, x)


def is_suggestion(score: float, signals: list[dict], cfg: dict) -> bool:
    """Decision rule. Complaints that merely share an institution (e.g. lab vs fees) are NOT suggested:
    there must be real text overlap, and either a same/related category or a clearly higher score."""
    text_ok = any(s["type"] == "text" for s in signals)
    cat_ok = any(s["type"] == "category" for s in signals)
    th = cfg["overlap_threshold"]
    return score >= th and text_ok and (cat_ok or score >= th + 0.15)


def scan_complaint(db: Session, c: Complaint) -> list[CaseLink]:
    cfg = config_svc.all_config(db)
    others = db.scalars(select(Complaint).where(Complaint.institution_id == c.institution_id, Complaint.id != c.id)).all()
    if not others:
        return []
    sim = Similarity([f"{x.subject} {x.description}" for x in others + [c]])
    try:
        vecs = semantic.vectors_for(db, others + [c])  # {} when the model is not ready: basic matcher is used
    except Exception:  # noqa: BLE001 - matching must never break complaint registration
        vecs = {}
    method = "multilingual-ai" if vecs else sim.method
    existing = {(l.case_a_id, l.case_b_id) for l in db.scalars(select(CaseLink).where(
        (CaseLink.case_a_id == c.id) | (CaseLink.case_b_id == c.id)))}
    created = []
    for o in others:
        a_id, b_id = pair_key(c.id, o.id)
        if (a_id, b_id) in existing:
            continue  # already suggested / linked / dismissed: never resurface a dismissed pair
        sem = semantic.cosine(vecs[c.id], vecs[o.id]) if vecs else None
        score, signals = score_pair(as_dict(c), as_dict(o), sim, cfg, sem)
        if is_suggestion(score, signals, cfg):
            link = CaseLink(case_a_id=a_id, case_b_id=b_id, score=score, signals=signals, method=method)
            db.add(link)
            created.append(link)
    db.flush()
    return created


def scan_all(db: Session) -> int:
    n = 0
    for c in db.scalars(select(Complaint).order_by(Complaint.id)).all():
        n += len(scan_complaint(db, c))
    return n