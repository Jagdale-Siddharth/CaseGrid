"""Authentication + authorisation. All access decisions are made here, on the server."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Complaint, User
from .security import decode_token
from .services.audit import audit

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    user = db.get(User, int(payload["sub"]))
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User inactive or not found")
    return user


def require(*perms: str):
    """Dependency factory: user must hold at least one of the permissions."""
    def dep(user: User = Depends(current_user), db: Session = Depends(get_db)) -> User:
        if not any(user.has(p) for p in perms):
            audit(db, "access.denied", user, "permission", "", f"needs one of {perms}", success=False)
            db.commit()
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Permission required: {' or '.join(perms)}")
        return user
    return dep


def sees_all(user: User) -> bool:
    return bool(user.role.all_bureaus)


def case_scope_filter(user: User):
    """SQL filter limiting complaints to what the user may see."""
    if sees_all(user):
        return Complaint.id.is_not(None)
    return Complaint.bureau_id == (user.bureau_id or -1)


def can_view_case(user: User, c: Complaint) -> bool:
    if not (user.has("case:read") or user.has("case:read_all")):
        return False
    return sees_all(user) or c.bureau_id == user.bureau_id


def get_case_or_404(db: Session, user: User, case_ref: str) -> Complaint:
    """Look up by case_id (CMP-...) or numeric id. 404 (not 403) when out of scope to avoid leaking existence."""
    stmt = select(Complaint).where(Complaint.case_id == case_ref)
    c = db.scalars(stmt).first()
    if c is None and case_ref.isdigit():
        c = db.get(Complaint, int(case_ref))
    if c is None or not can_view_case(user, c):
        if c is not None:
            audit(db, "access.denied", user, "complaint", c.case_id, "case outside user scope", success=False)
            db.commit()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    return c


citizen_oauth2 = OAuth2PasswordBearer(tokenUrl="/citizen/auth/verify-otp", auto_error=False)


def current_citizen(token: str | None = Depends(citizen_oauth2), db: Session = Depends(get_db)):
    from .models import CitizenUser
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Citizen authentication required", headers={"WWW-Authenticate": "Bearer"})
    payload = decode_token(token)
    if not payload or payload.get("type") != "citizen":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired citizen token", headers={"WWW-Authenticate": "Bearer"})
    citizen = db.get(CitizenUser, int(payload["sub"]))
    if not citizen:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Citizen account not found")
    return citizen
