from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import can_view_case, get_case_or_404, require
from ..models import CaseLink, Complaint, User, utcnow
from ..models import ComplaintEmbedding
from ..services import overlap, semantic
from ..services.audit import audit, history

router = APIRouter(prefix="/overlaps", tags=["Potential overlaps"])


def case_view(c: Complaint, user: User) -> dict:
    """Full detail only for cases inside the caller's scope; otherwise a redacted summary."""
    base = {"id": c.id, "case_id": c.case_id, "bureau": c.bureau.name, "category": c.category, "status": c.status,
            "institution": c.institution.name, "registered_on": c.registered_on.isoformat()}
    if can_view_case(user, c):
        return {**base, "subject": c.subject, "description": c.description, "redacted": False}
    return {**base, "subject": "(restricted: belongs to another bureau)", "description": "", "redacted": True}


def link_out(l: CaseLink, user: User) -> dict:
    return {"id": l.id, "status": l.status, "score": l.score, "signals": l.signals, "method": l.method, "origin": l.origin,
            "decision_reason": l.decision_reason, "decided_at": l.decided_at, "created_at": l.created_at,
            "case_a": case_view(l.case_a, user), "case_b": case_view(l.case_b, user)}


def visible(l: CaseLink, user: User) -> bool:
    return can_view_case(user, l.case_a) or can_view_case(user, l.case_b)


@router.get("/engine")
def engine_status(user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    """Which matching engine is active (shown to officers so they know how related cases were found)."""
    st = semantic.status()
    st["cases_indexed"] = db.scalar(select(func.count()).select_from(ComplaintEmbedding)) or 0
    st["languages"] = "English, Hindi, Marathi and 50+ other languages" if st["engine"] == "multilingual-ai" else "Basic word matching (best within one language)"
    return st


@router.get("")
def list_links(status: str = "", user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    stmt = select(CaseLink).order_by(CaseLink.score.desc(), CaseLink.id.desc())
    if status:
        stmt = stmt.where(CaseLink.status == status)
    return [link_out(l, user) for l in db.scalars(stmt).unique().all() if visible(l, user)]


@router.post("/{link_id}/decision")
def decide(link_id: int, body: schemas.LinkDecision, user: User = Depends(require("link:review")), db: Session = Depends(get_db)):
    l = db.get(CaseLink, link_id)
    if not l or not visible(l, user):
        raise HTTPException(404, "Suggestion not found")
    if body.decision in ("link", "dismiss") and l.status != "suggested":
        raise HTTPException(409, f"Suggestion already {l.status}")
    if body.decision == "unlink" and l.status != "linked":
        raise HTTPException(409, "Only linked cases can be unlinked")
    new = {"link": "linked", "dismiss": "dismissed", "unlink": "unlinked"}[body.decision]
    l.status, l.decision_reason, l.decided_by, l.decided_at = new, body.reason.strip(), user.id, utcnow()
    for mine, other in ((l.case_a, l.case_b), (l.case_b, l.case_a)):
        history(db, mine, "link", f"Overlap with {other.case_id} {new} ({body.reason.strip()})", user)
    audit(db, f"overlap.{body.decision}", user, "case_link", l.id, f"{l.case_a.case_id}/{l.case_b.case_id}: {body.reason.strip()}")
    db.commit()
    return link_out(l, user)


@router.post("/manual", status_code=201)
def manual_link(body: schemas.ManualLinkIn, user: User = Depends(require("link:review")), db: Session = Depends(get_db)):
    a = db.scalars(select(Complaint).where(Complaint.case_id == body.case_a)).first()
    b = db.scalars(select(Complaint).where(Complaint.case_id == body.case_b)).first()
    if not a or not b or a.id == b.id or not (can_view_case(user, a) or can_view_case(user, b)):
        raise HTTPException(404, "Cases not found")
    x, y = overlap.pair_key(a.id, b.id)
    if db.scalars(select(CaseLink).where(CaseLink.case_a_id == x, CaseLink.case_b_id == y)).first():
        raise HTTPException(409, "These cases already have a suggestion or decision. Use the decision endpoint.")
    l = CaseLink(case_a_id=x, case_b_id=y, status="linked", origin="manual", method="manual", score=0.0,
                 signals=[{"type": "manual", "label": "Linked manually by officer", "detail": body.reason, "weight": 0}],
                 decision_reason=body.reason.strip(), decided_by=user.id, decided_at=utcnow())
    db.add(l)
    db.flush()
    for mine, other in ((a, b), (b, a)):
        history(db, mine, "link", f"Manually linked with {other.case_id} ({body.reason.strip()})", user)
    audit(db, "overlap.manual", user, "case_link", l.id, body.reason)
    db.commit()
    db.refresh(l)
    return link_out(l, user)


@router.post("/scan")
def scan(user: User = Depends(require("overlap:scan")), db: Session = Depends(get_db)):
    n = overlap.scan_all(db)
    audit(db, "overlap.scan", user, "case_link", "", f"{n} new suggestion(s)")
    db.commit()
    return {"new_suggestions": n}