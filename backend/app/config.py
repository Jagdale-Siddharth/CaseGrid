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
    # Multilingual meaning-based matching (English, Hindi, Marathi and 50+ other languages).
    # Small local ONNX model: no API key, no per-request network call, never blocks a request.
    semantic_enabled: bool = True
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    model_cache_dir: str = "models_cache"
    semantic_retry_minutes: int = 15   # after a failed model load, wait this long before trying again
    semantic_floor: float = 0.30       # cosine at/below this counts as "unrelated"
    semantic_ceiling: float = 0.80     # cosine at/above this counts as "same issue"
    resend_api_key: str = ""
    resend_from_email: str = "AICTE Grievance Portal <onboarding@resend.dev>"
    # SMTP (Gmail / Brevo / Outlook / SES ...) - delivers OTP to ANY recipient address.
    # If SMTP_HOST + SMTP_USER + SMTP_PASSWORD are set, SMTP is used instead of Resend.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""          # defaults to SMTP_USER when blank
    smtp_use_ssl: bool = False         # True for port 465 (implicit SSL); False = STARTTLS (587)
    # Dev only: if real delivery fails, still return the OTP in the API response.
    otp_debug_fallback: bool = True


settings = Settings()


def today() -> date:
    if settings.fixed_today:
        return date.fromisoformat(settings.fixed_today)
    return date.today()