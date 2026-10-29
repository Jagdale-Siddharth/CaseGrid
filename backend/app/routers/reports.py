import csv
import io
from collections import Counter

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import today
from ..database import get_db
from ..deps import case_scope_filter, require
from ..models import Complaint, Institution, User
from ..services import sla
from ..services.audit import audit

router = APIRouter(prefix="/reports", tags=["Reports"])
COLS = ["case_id", "institution_code", "institution", "state", "category", "subject", "bureau", "officer", "status", "priority",
        "registered_on", "due_date", "resolved_on", "age_days", "sla_state"]


def query(db: Session, user: User, institution_id, bureau_id, category, status, date_from, date_to, state=""):
    stmt = select(Complaint).join(Institution, Complaint.institution_id == Institution.id).where(case_scope_filter(user))  # scope is ALWAYS applied
    if institution_id:
        stmt = stmt.where(Complaint.institution_id == institution_id)
    if bureau_id:
        stmt = stmt.where(Complaint.bureau_id == bureau_id)
    if category:
        stmt = stmt.where(Complaint.category == category)
    if status:
        stmt = stmt.where(Complaint.status == status)
    if state:
        stmt = stmt.where(Institution.state == state)
    if date_from:
        stmt = stmt.where(Complaint.registered_on >= date_from)
    if date_to:
        stmt = stmt.where(Complaint.registered_on <= date_to)
    return db.scalars(stmt.order_by(Complaint.registered_on, Complaint.id)).unique().all()


def rows_of(db, cases):
    t = today()
    out = []
    for c in cases:
        s = sla.sla_state(db, c, t)
        out.append({"case_id": c.case_id, "institution_code": c.institution.code, "institution": c.institution.name,
                    "state": c.institution.state,
                    "category": c.category, "subject": c.subject, "bureau": c.bureau.name,
                    "officer": c.officer.full_name if c.officer else "Unassigned", "status": c.status, "priority": c.priority,
                    "registered_on": c.registered_on.isoformat(), "due_date": c.due_date.isoformat(),
                    "resolved_on": c.resolved_on.isoformat() if c.resolved_on else "", "age_days": s["age_days"], "sla_state": s["state"]})
    return out


@router.get("/cases")
def report(institution_id: int | None = None, bureau_id: int | None = None, category: str = "", status: str = "",
           state: str = "", date_from: str = "", date_to: str = "", user: User = Depends(require("report:view")), db: Session = Depends(get_db)):
    rows = rows_of(db, query(db, user, institution_id, bureau_id, category, status, date_from, date_to, state))
    summ = {k: [{"name": n, "value": v} for n, v in Counter(r[k] for r in rows).most_common()]
            for k in ("status", "bureau", "category", "institution", "state", "sla_state")}
    return {"total": len(rows), "summary": summ, "rows": rows, "can_export": user.has("report:export")}


@router.get("/export")
def export(fmt: str = Query("csv", pattern="^(csv|json)$"), institution_id: int | None = None, bureau_id: int | None = None,
           category: str = "", status: str = "", state: str = "", date_from: str = "", date_to: str = "",
           user: User = Depends(require("report:export")), db: Session = Depends(get_db)):
    rows = rows_of(db, query(db, user, institution_id, bureau_id, category, status, date_from, date_to, state))
    audit(db, "report.export", user, "report", fmt, f"{len(rows)} rows; filters: inst={institution_id} bureau={bureau_id} cat={category} status={status} state={state} {date_from}..{date_to}")
    db.commit()
    if fmt == "json":
        from fastapi.responses import JSONResponse
        return JSONResponse(rows, headers={"Content-Disposition": "attachment; filename=complaints-report.json"})
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=COLS)
    w.writeheader()
    for r in rows:
        # neutralise spreadsheet formula injection
        w.writerow({k: ("'" + v if isinstance(v, str) and v[:1] in "=+-@" else v) for k, v in r.items()})
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=complaints-report.csv"})
