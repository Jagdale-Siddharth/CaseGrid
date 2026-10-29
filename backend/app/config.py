from datetime import date
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://aicte:aicte@localhost:5432/aicte_complaints"
    secret_key: str = "change-me-in-production-please-use-a-long-random-string"
    access_token_minutes: int = 480
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    upload_dir: str = "uploads"
    max_upload_mb: int = 10
    # Demo clock. If set (YYYY-MM-DD) all ageing/overdue maths use this date,
    # which keeps the seeded demo stable. Leave empty to use the real date.
    fixed_today: str = ""
    enable_scheduler: bool = False
    scheduler_minutes: int = 60
    bcrypt_rounds: int = 12
    use_embeddings: bool = False  # optional sentence-transformers similarity
    resend_api_key: str = ""
    resend_from_email: str = "AICTE Grievance Portal <onboarding@resend.dev>"


settings = Settings()


def today() -> date:
    if settings.fixed_today:
        return date.fromisoformat(settings.fixed_today)
    return date.today()
