"""Reminder / overdue / escalation alerts with de-duplication.

A unique dedupe_key (case + kind + due date) means running the check repeatedly can never create
duplicate notifications. Re-planning a due date produces a fresh key, which is intended.
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import CaseLink, Complaint, Notification, User
from . import sla
from .audit import audit, history


def run_checks(db: Session, today: date, actor: User | None = None) -> dict:
    created = suppressed = 0
    open_cases = db.scalars(select(Complaint).where(Complaint.status != "Resolved")).all()
    existing = {k for (k,) in db.execute(select(Notification.dedupe_key))}
    for c in open_cases:
        st = sla.sla_state(db, c, today)
        kinds = {"due_soon": ["pending"], "overdue": ["overdue"], "escalated": ["overdue", "escalated"]}.get(st["state"], [])
        for kind in kinds:
            key = f"{c.case_id}:{kind}:{c.due_date.isoformat()}"
            if key in existing:
                suppressed += 1
                continue
            existing.add(key)
            if kind == "pending":
                msg = f"{c.case_id} is due in {st['days_left']} day(s) ({c.due_date})"
            elif kind == "overdue":
                msg = f"{c.case_id} is overdue (due {c.due_date})"
            else:
                msg = f"{c.case_id} is {-st['days_left']} day(s) overdue and has been escalated to a supervisor"
            db.add(Notification(complaint_id=c.id, kind=kind, message=msg, dedupe_key=key,
                                recipient_user_id=None if kind == "escalated" else c.officer_id,
                                recipient_role="supervisor" if kind == "escalated" else None))
            history(db, c, "alert", f"Alert generated: {kind}", None)
            created += 1

    # Overlap alerts (PS 26264: Duplicate / overlapping case alerts)
    suggested_links = db.scalars(select(CaseLink).where(CaseLink.status == "suggested")).all()
    for l in suggested_links:
        key = f"overlap:{l.case_a_id}:{l.case_b_id}"
        if key in existing:
            suppressed += 1
            continue
        existing.add(key)
        ca = l.case_a
        cb = l.case_b
        msg = f"Potential Overlapping Cases: {ca.case_id} & {cb.case_id} at {ca.institution.name} ({round(l.score*100)}% match) – Coordination Required"
        db.add(Notification(complaint_id=ca.id, kind="overlap", message=msg, dedupe_key=key,
                            recipient_user_id=None, recipient_role="supervisor"))
        history(db, ca, "alert", f"Overlap alert generated with {cb.case_id}", None)
        created += 1

    audit(db, "alerts.run", actor, "notification", "", f"created={created} suppressed_duplicates={suppressed}")
    db.flush()
    return {"created": created, "suppressed_duplicates": suppressed, "checked": len(open_cases)}
