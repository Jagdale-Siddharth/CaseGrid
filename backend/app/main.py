import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register tables)
from .config import settings, today
from .database import Base, SessionLocal, engine
from .routers import admin, auth, citizen, complaints, dashboard, institutions, overlaps, reports
from .services import alerts, semantic


def _migrate_schema():
    """Ensure newly added columns exist in complaints table (for SQLite/Postgres without Alembic)."""
    try:
        with engine.connect() as conn:
            if engine.url.drivername.startswith("sqlite"):
                cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(complaints)").fetchall()]
                new_cols = [
                    ("complainant_email", "VARCHAR(160)"),
                    ("complainant_name", "VARCHAR(120)"),
                    ("complainant_phone", "VARCHAR(30)"),
                    ("is_urgent", "BOOLEAN DEFAULT 0"),
                    ("geo_latitude", "FLOAT"),
                    ("geo_longitude", "FLOAT"),
                    ("geo_address", "VARCHAR(255)"),
                    ("photo_url", "VARCHAR(255)"),
                ]
                for col, ctype in new_cols:
                    if col not in cols:
                        conn.exec_driver_sql(f"ALTER TABLE complaints ADD COLUMN {col} {ctype}")
                conn.commit()
    except Exception as e:
        print(f"Schema auto-migration notice: {e}")


async def _scheduler():
    while True:
        await asyncio.sleep(settings.scheduler_minutes * 60)
        with SessionLocal() as db:
            alerts.run_checks(db, today())
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    _migrate_schema()
    semantic.warm_up()  # loads the small multilingual model in the background; never blocks start-up
    task = asyncio.create_task(_scheduler()) if settings.enable_scheduler else None
    yield
    if task:
        task.cancel()


app = FastAPI(title="AICTE Integrated Complaint Monitoring API", version="1.0.0", lifespan=lifespan,
              description="Institution-wise complaint tracking across AICTE bureaus/cells. Synthetic demo data only.")

# Allow all origins for seamless web and Expo mobile app communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, citizen, institutions, complaints, overlaps, dashboard, reports, admin):
    app.include_router(r.router)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "as_of": today().isoformat()}