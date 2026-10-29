from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from .config import settings

ALGO = "HS256"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt(rounds=settings.bcrypt_rounds)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(user_id: int, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": exp}, settings.secret_key, algorithm=ALGO)


def create_citizen_token(citizen_id: int, email: str) -> str:
    # 30-day token for citizen mobile app session
    exp = datetime.now(timezone.utc) + timedelta(days=30)
    return jwt.encode({"sub": str(citizen_id), "email": email, "type": "citizen", "exp": exp}, settings.secret_key, algorithm=ALGO)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGO])
    except JWTError:
        return None
