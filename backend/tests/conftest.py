import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("BCRYPT_ROUNDS", "4")
from app.config import settings  # noqa: E402

settings.bcrypt_rounds = 4
settings.fixed_today = "2026-10-23"
settings.upload_dir = "/tmp/aicte-test-uploads"

from app import database, models  # noqa: E402,F401
from app.database import Base, get_db, make_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import DEMO_PASSWORD, seed  # noqa: E402

TEST_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")


@pytest.fixture()
def db_engine():
    eng = make_engine(TEST_URL)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    Session = sessionmaker(bind=eng, autoflush=False, expire_on_commit=False)
    with Session() as s:
        seed(s)
    yield eng, Session
    Base.metadata.drop_all(eng)


@pytest.fixture()
def client(db_engine):
    eng, Session = db_engine

    def override():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        c.Session = Session
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def login(client):
    cache = {}

    def _login(username):
        if username not in cache:
            r = client.post("/auth/login", data={"username": username, "password": DEMO_PASSWORD})
            assert r.status_code == 200, r.text
            cache[username] = {"Authorization": f"Bearer {r.json()['access_token']}"}
        return cache[username]
    return _login


def inst_by_name(client, h, name):
    items = client.get("/institutions", params={"q": name, "size": 5}, headers=h).json()["items"]
    return items[0]
