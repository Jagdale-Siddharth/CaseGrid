from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Bureau, Complaint, Institution, Role, RoutingRule, User
from . import config_svc


def build_backup(db: Session) -> dict:
    return {
        "config": config_svc.all_config(db),
        "roles": [{"name": r.name, "description": r.description, "all_bureaus": r.all_bureaus, "permissions": r.permissions} for r in db.scalars(select(Role))],
        "bureaus": [{"code": b.code, "name": b.name, "is_review_queue": b.is_review_queue} for b in db.scalars(select(Bureau))],
        "routing_rules": [{"category": r.category, "state": r.state, "bureau": r.bureau.code, "is_verified": r.is_verified, "source_note": r.source_note}
                          for r in db.scalars(select(RoutingRule)).unique()],
        "users": [{"username": u.username, "full_name": u.full_name, "role": u.role.name, "bureau": u.bureau.code if u.bureau else None}
                  for u in db.scalars(select(User)).unique()],
        "institutions": [{"code": i.code, "name": i.name, "state": i.state, "city": i.city, "type": i.inst_type} for i in db.scalars(select(Institution))],
        "complaints": [{"case_id": c.case_id, "institution": c.institution.code, "category": c.category, "subject": c.subject,
                        "description": c.description, "status": c.status, "priority": c.priority, "bureau": c.bureau.code,
                        "registered_on": c.registered_on.isoformat(), "due_date": c.due_date.isoformat()}
                       for c in db.scalars(select(Complaint)).unique()],
    }
