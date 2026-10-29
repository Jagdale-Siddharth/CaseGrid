from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import today
from ..database import get_db
from ..deps import case_scope_filter, can_view_case, require
from ..models import Bureau, CaseAssignment, CaseHistory, CaseLink, Complaint, Institution, User
from ..services import sla
from .common import complaints_out

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def summary(user: User = Depends(require("dashboard:view")), db: Session = Depends(get_db)):
    t = today()
    cases = db.scalars(select(Complaint).where(case_scope_filter(user))).unique().all()
    states = {c.id: sla.sla_state(db, c, t) for c in cases}
    open_cases = [c for c in cases if c.status != "Resolved"]
    overdue = [c for c in open_cases if states[c.id]["state"] in ("overdue", "escalated")]
    due_soon = [c for c in open_cases if states[c.id]["state"] == "due_soon"]

    by_bureau = []
    for b in db.scalars(select(Bureau).where(Bureau.active.is_(True)).order_by(Bureau.id)):
        mine = [c for c in cases if c.bureau_id == b.id]
        if mine or user.role.all_bureaus:
            by_bureau.append({"bureau": b.name, "total": len(mine), "open": sum(c.status != "Resolved" for c in mine),
                              "overdue": sum(c in overdue for c in mine)})
    ageing = Counter(sla.age_bucket(states[c.id]["age_days"]) for c in open_cases)
    officers = Counter((c.officer.full_name if c.officer else "Unassigned") for c in open_cases)
    months = sorted({c.registered_on.strftime("%Y-%m") for c in cases})
    trend = [{"month": m, "registered": sum(c.registered_on.strftime("%Y-%m") == m for c in cases),
              "resolved": sum(bool(c.resolved_on) and c.resolved_on.strftime("%Y-%m") == m for c in cases)} for m in months]
    inst_counts = Counter(c.institution.name for c in cases)
    ids = [c.id for c in cases]
    transferred_ids = set(db.scalars(
        select(CaseAssignment.complaint_id)
        .where(CaseAssignment.complaint_id.in_(ids or [0]))
        .group_by(CaseAssignment.complaint_id)
        .having(func.count(CaseAssignment.id) > 1)
    ).all())
    recent = db.scalars(select(CaseHistory).where(CaseHistory.complaint_id.in_(ids or [0]), CaseHistory.event_type != "alert").order_by(CaseHistory.id.desc()).limit(10)).all()
    case_by_id = {c.id: c for c in cases}
    links = [l for l in db.scalars(select(CaseLink).where(CaseLink.status == "suggested")).unique().all()
             if can_view_case(user, l.case_a) or can_view_case(user, l.case_b)]
    review = [c for c in open_cases if c.bureau.is_review_queue]
    attention = sorted(overdue + due_soon, key=lambda c: (c.due_date, c.id))[:8]
    return {
        "as_of": t.isoformat(), "scope": "all bureaus" if user.role.all_bureaus else (user.bureau.name if user.bureau else "none"),
        "totals": {
            "registered": len(cases),
            "pending": len(open_cases),
            "under_process": sum(c.status in ("In Progress", "Under Review") for c in cases),
            "resolved": len(cases) - len(open_cases),
            "disposed": len(cases) - len(open_cases),
            "transferred": len(transferred_ids),
            "overdue": len(overdue),
            "due_soon": len(due_soon),
            "escalated": sum(states[c.id]["state"] == "escalated" for c in open_cases),
            "in_manual_review": len(review),
            "awaiting_information": sum(c.status == "Pending Information" for c in open_cases),
            "potential_overlaps": len(links),
        },
        "by_status": [{"name": k, "value": v} for k, v in Counter(c.status for c in cases).items()],
        "by_category": [{"name": k, "value": v} for k, v in Counter(c.category for c in cases).most_common()],
        "by_bureau": by_bureau,
        "by_institution": [{"name": k, "value": v} for k, v in inst_counts.most_common(10)],
        "ageing": [{"name": k, "value": ageing.get(k, 0)} for k in ("0-7 days", "8-14 days", "15-30 days", "30+ days")],
        "workload": [{"name": k, "value": v} for k, v in officers.most_common()],
        "trend": trend,
        "recent_activity": [{"case_id": case_by_id[h.complaint_id].case_id, "event": h.description, "actor": h.actor_name,
                             "at": h.created_at} for h in recent if h.complaint_id in case_by_id],
        "attention": complaints_out(db, attention),
    }
