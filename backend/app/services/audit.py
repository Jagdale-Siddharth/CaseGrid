from sqlalchemy.orm import Session

from ..models import AuditEvent, CaseHistory, User


def audit(db: Session, action: str, user: User | None = None, entity: str = "", entity_id="",
          detail: str = "", success: bool = True) -> None:
    db.add(AuditEvent(action=action, entity=entity, entity_id=str(entity_id), detail=detail,
                      actor_id=user.id if user else None,
                      actor_name=user.full_name if user else "System", success=success))


def history(db: Session, complaint, event_type: str, description: str, user: User | None = None,
            old: str | None = None, new: str | None = None) -> None:
    db.add(CaseHistory(complaint_id=complaint.id, event_type=event_type, description=description,
                       old_value=old, new_value=new, actor_id=user.id if user else None,
                       actor_name=user.full_name if user else "System",
                       actor_role=user.role.name if user else "system"))
    if event_type != "alert":
        complaint.last_action = description[:250]
