from ..services import config_svc
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..config import today
from ..models import Complaint, Document
from ..services import sla


def complaint_out(db: Session, c: Complaint) -> schemas.ComplaintOut:
    out = schemas.ComplaintOut.model_validate(c)
    out.sla = schemas.SlaOut(**sla.sla_state(db, c, today()))
    out.document_count = db.scalar(select(func.count(Document.id)).where(Document.complaint_id == c.id)) or 0
    return out


def complaints_out(db: Session, items: list[Complaint]) -> list[schemas.ComplaintOut]:
    if not items:
        return []
    warn = int(config_svc.get(db, "warn_days"))
    esc = int(config_svc.get(db, "escalation_days"))
    t = today()
    counts = dict(db.execute(select(Document.complaint_id, func.count(Document.id))
                             .where(Document.complaint_id.in_([c.id for c in items])).group_by(Document.complaint_id)).all())
    res = []
    for c in items:
        o = schemas.ComplaintOut.model_validate(c)
        o.sla = schemas.SlaOut(**sla.sla_state(db, c, t, warn=warn, esc=esc))
        o.document_count = counts.get(c.id, 0)
        res.append(o)
    return res
