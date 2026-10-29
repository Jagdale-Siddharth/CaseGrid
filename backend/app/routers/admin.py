from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import schemas
from ..config import today
from ..database import get_db
from ..deps import can_view_case, require
from ..models import (AuditEvent, Bureau, Complaint, Institution, Notification, Role, RoutingRule, User)
from ..security import hash_password
from ..services import alerts, config_svc
from ..services.audit import audit

router = APIRouter(tags=["Administration"])


@router.get("/meta")
def meta(user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    cfg = config_svc.all_config(db)
    states = [s[0] for s in db.execute(select(Institution.state).distinct().order_by(Institution.state)).all() if s[0]]
    return {"categories": cfg["categories"], "priorities": ["High", "Medium", "Low"],
            "statuses": ["Open", "In Progress", "Pending Information", "Under Review", "Resolved"],
            "sources": ["Portal", "Email", "Letter", "Phone", "Walk-in"], "transitions": {k: list(v) for k, v in config_svc.TRANSITIONS.items()},
            "states": states,
            "as_of": today().isoformat()}


@router.get("/bureaus", response_model=list[schemas.BureauOut])
def bureaus(user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    return db.scalars(select(Bureau).where(Bureau.active.is_(True)).order_by(Bureau.id)).all()


@router.get("/roles", response_model=list[schemas.RoleOut])
def roles(user: User = Depends(require("user:manage")), db: Session = Depends(get_db)):
    return db.scalars(select(Role)).all()


@router.get("/users", response_model=list[schemas.UserOut])
def users(user: User = Depends(require("user:manage", "case:assign")), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).unique().all()


@router.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(body: schemas.UserCreate, user: User = Depends(require("user:manage")), db: Session = Depends(get_db)):
    if db.scalars(select(User).where(User.username == body.username)).first():
        raise HTTPException(409, "Username already exists")
    if not db.get(Role, body.role_id):
        raise HTTPException(422, "Unknown role")
    u = User(username=body.username, full_name=body.full_name, email=body.email, password_hash=hash_password(body.password),
             role_id=body.role_id, bureau_id=body.bureau_id)
    db.add(u)
    db.flush()
    audit(db, "user.create", user, "user", u.username)
    db.commit()
    db.refresh(u)
    return u


@router.get("/routing-rules")
def rules(user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    return [{"id": r.id, "category": r.category, "state": r.state, "bureau": schemas.BureauOut.model_validate(r.bureau).model_dump(),
             "is_verified": r.is_verified, "source_note": r.source_note, "active": r.active}
            for r in db.scalars(select(RoutingRule).order_by(RoutingRule.category, RoutingRule.id)).unique()]


@router.post("/routing-rules", status_code=201)
def create_rule(body: schemas.RoutingRuleIn, user: User = Depends(require("routing:manage")), db: Session = Depends(get_db)):
    if body.category not in config_svc.get(db, "categories") or not db.get(Bureau, body.bureau_id):
        raise HTTPException(422, "Unknown category or bureau")
    r = RoutingRule(**body.model_dump())
    db.add(r)
    db.flush()
    audit(db, "routing.create", user, "routing_rule", r.id, f"{r.category} -> bureau {r.bureau_id}")
    db.commit()
    return {"id": r.id}


@router.put("/routing-rules/{rule_id}")
def update_rule(rule_id: int, body: schemas.RoutingRuleIn, user: User = Depends(require("routing:manage")), db: Session = Depends(get_db)):
    r = db.get(RoutingRule, rule_id)
    if not r or not db.get(Bureau, body.bureau_id):
        raise HTTPException(404, "Rule or bureau not found")
    old = f"{r.category}->{r.bureau_id} verified={r.is_verified} active={r.active}"
    for k, v in body.model_dump().items():
        setattr(r, k, v)
    audit(db, "routing.update", user, "routing_rule", r.id, f"{old} => {r.category}->{r.bureau_id} verified={r.is_verified} active={r.active}")
    db.commit()
    return {"id": r.id}


@router.get("/config")
def get_config(user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    return config_svc.all_config(db)


@router.put("/config")
def put_config(body: schemas.ConfigIn, user: User = Depends(require("config:manage")), db: Session = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if "sla_days" in changes and set(changes["sla_days"]) != {"High", "Medium", "Low"}:
        raise HTTPException(422, "sla_days must define High, Medium and Low")
    for k, v in changes.items():
        config_svc.put(db, k, v)
    audit(db, "config.update", user, "settings", "", str(changes))
    db.commit()
    return config_svc.all_config(db)


@router.get("/audit")
def audit_log(action: str = "", success: bool | None = None, limit: int = Query(100, ge=1, le=500),
              user: User = Depends(require("audit:read")), db: Session = Depends(get_db)):
    stmt = select(AuditEvent).order_by(AuditEvent.id.desc()).limit(limit)
    if action:
        stmt = stmt.where(AuditEvent.action.like(f"{action}%"))
    if success is not None:
        stmt = stmt.where(AuditEvent.success.is_(success))
    return [{"id": a.id, "action": a.action, "entity": a.entity, "entity_id": a.entity_id, "detail": a.detail,
             "actor": a.actor_name, "success": a.success, "at": a.created_at} for a in db.scalars(stmt)]


def _mine(user: User, n: Notification) -> bool:
    return (n.recipient_user_id == user.id or (n.recipient_role is not None and n.recipient_role == user.role.name)
            or (user.role.all_bureaus and n.recipient_role is None and user.has("alerts:run"))) and can_view_case(user, n.complaint)


@router.get("/notifications")
def notifications(unread_only: bool = False, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).order_by(Notification.id.desc())).unique().all()
    return [{"id": n.id, "case_id": n.complaint.case_id, "kind": n.kind, "message": n.message, "is_read": n.is_read,
             "created_at": n.created_at, "recipient_role": n.recipient_role} for n in rows if _mine(user, n) and not (unread_only and n.is_read)]


@router.post("/notifications/{nid}/read")
def mark_read(nid: int, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or not _mine(user, n):
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/alerts/run")
def run_alerts(user: User = Depends(require("alerts:run")), db: Session = Depends(get_db)):
    res = alerts.run_checks(db, today(), user)
    db.commit()
    return res


@router.get("/admin/export")
def export_backup(user: User = Depends(require("config:manage")), db: Session = Depends(get_db)):
    """Full export of seeded data + configuration (no password hashes) for the offline demo backup."""
    from ..services.backup import build_backup
    audit(db, "backup.export", user, "system")
    db.commit()
    return build_backup(db)
