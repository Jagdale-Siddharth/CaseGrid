from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import current_user
from ..models import User
from ..security import create_token, verify_password
from ..services.audit import audit

router = APIRouter(prefix="/auth", tags=["Authentication"])
MAX_FAILS, LOCK_MIN = 5, 10


@router.post("/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalars(select(User).where(User.username == form.username)).first()
    now = datetime.now(timezone.utc)
    if user and user.locked_until:
        lu = user.locked_until if user.locked_until.tzinfo else user.locked_until.replace(tzinfo=timezone.utc)
        if lu > now:
            audit(db, "login.locked", user, "user", user.id, "login attempt while locked", success=False)
            db.commit()
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Account temporarily locked. Try again later.")
    if not user or not user.active or not verify_password(form.password, user.password_hash):
        if user:
            user.failed_logins += 1
            if user.failed_logins >= MAX_FAILS:
                user.locked_until = now + timedelta(minutes=LOCK_MIN)
                user.failed_logins = 0
        audit(db, "login.failure", user, "user", user.id if user else "", f"username={form.username}", success=False)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")
    user.failed_logins = 0
    user.locked_until = None
    audit(db, "login.success", user, "user", user.id)
    db.commit()
    return schemas.TokenOut(access_token=create_token(user.id, user.role.name), user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(current_user)):
    return user
