"""SQLAlchemy data model. Entities follow section H of the problem statement."""
from datetime import date, datetime, timezone

from sqlalchemy import (JSON, Boolean, Date, DateTime, Float, ForeignKey, Index, Integer,
                        String, Text, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    # all_bureaus=True -> can see every bureau; False -> scoped to the user's own bureau
    all_bureaus: Mapped[bool] = mapped_column(Boolean, default=False)
    permissions: Mapped[list] = mapped_column(JSON, default=list)


class Bureau(Base):
    __tablename__ = "bureaus"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    is_review_queue: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    bureau_id: Mapped[int | None] = mapped_column(ForeignKey("bureaus.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    role: Mapped[Role] = relationship(lazy="joined")
    bureau: Mapped[Bureau | None] = relationship(lazy="joined")

    def has(self, perm: str) -> bool:
        return perm in (self.role.permissions or [])


class Institution(Base):
    __tablename__ = "institutions"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # stable identifier
    name: Mapped[str] = mapped_column(String(255), index=True)
    aliases: Mapped[list] = mapped_column(JSON, default=list)
    inst_type: Mapped[str] = mapped_column(String(60), default="")
    state: Mapped[str] = mapped_column(String(60), default="", index=True)
    city: Mapped[str] = mapped_column(String(80), default="")
    affiliating_body: Mapped[str] = mapped_column(String(160), default="")
    contact_email: Mapped[str] = mapped_column(String(160), default="")
    established_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RoutingRule(Base):
    """Configurable routing. is_verified=False marks demo/prototype rules."""
    __tablename__ = "routing_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    state: Mapped[str | None] = mapped_column(String(60), nullable=True)  # jurisdiction (optional)
    bureau_id: Mapped[int] = mapped_column(ForeignKey("bureaus.id"))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    source_note: Mapped[str] = mapped_column(String(255), default="Prototype rule - not verified against official AICTE procedure")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    bureau: Mapped[Bureau] = relationship(lazy="joined")


class Complaint(Base):
    __tablename__ = "complaints"
    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), index=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(40), default="Portal")
    priority: Mapped[str] = mapped_column(String(10), default="Medium")
    status: Mapped[str] = mapped_column(String(30), default="Open", index=True)
    registered_on: Mapped[date] = mapped_column(Date, index=True)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    bureau_id: Mapped[int] = mapped_column(ForeignKey("bureaus.id"), index=True)
    officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    last_action: Mapped[str] = mapped_column(String(255), default="Registered")
    pending_action: Mapped[str] = mapped_column(String(255), default="Initial review")
    routing_note: Mapped[str] = mapped_column(String(255), default="")
    resolved_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    complainant_email: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    complainant_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    complainant_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    geo_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    geo_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    geo_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    institution: Mapped[Institution] = relationship(lazy="joined")
    bureau: Mapped[Bureau] = relationship(lazy="joined", foreign_keys=[bureau_id])
    officer: Mapped[User | None] = relationship(lazy="joined", foreign_keys=[officer_id])

    __table_args__ = (Index("ix_complaints_inst_bureau", "institution_id", "bureau_id"),)


class CaseAssignment(Base):
    """Assignment history. The row with released_on IS NULL is the current one."""
    __tablename__ = "case_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    bureau_id: Mapped[int] = mapped_column(ForeignKey("bureaus.id"))
    officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str] = mapped_column(String(500), default="")
    assigned_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    released_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    bureau: Mapped[Bureau] = relationship(lazy="joined")
    officer: Mapped[User | None] = relationship(lazy="joined", foreign_keys=[officer_id])


class CaseHistory(Base):
    """Append-only chronology. Rows are never updated or deleted by the application."""
    __tablename__ = "case_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40))  # registered|status|assignment|note|edit|link|document|alert
    description: Mapped[str] = mapped_column(Text)
    old_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_name: Mapped[str] = mapped_column(String(120), default="System")
    actor_role: Mapped[str] = mapped_column(String(50), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CaseLink(Base):
    """Potential-overlap suggestion and the human decision about it."""
    __tablename__ = "case_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    case_a_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)  # always the smaller id
    case_b_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="suggested", index=True)  # suggested|linked|dismissed|unlinked
    score: Mapped[float] = mapped_column(Float, default=0.0)
    signals: Mapped[list] = mapped_column(JSON, default=list)
    method: Mapped[str] = mapped_column(String(30), default="rules+tfidf")
    origin: Mapped[str] = mapped_column(String(20), default="system")  # system|manual
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    case_a: Mapped[Complaint] = relationship(foreign_keys=[case_a_id], lazy="joined")
    case_b: Mapped[Complaint] = relationship(foreign_keys=[case_b_id], lazy="joined")
    __table_args__ = (UniqueConstraint("case_a_id", "case_b_id", name="uq_case_pair"),)


class ComplaintEmbedding(Base):
    """Cached meaning-vector of a complaint's text, so each complaint is embedded exactly once."""
    __tablename__ = "complaint_embeddings"
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), primary_key=True)
    model: Mapped[str] = mapped_column(String(120))
    text_hash: Mapped[str] = mapped_column(String(40))
    vector: Mapped[list] = mapped_column(JSON)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # pending|overdue|escalated
    message: Mapped[str] = mapped_column(String(500))
    recipient_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    recipient_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # one notification per (case, kind, due date) -> repeated checks cannot create duplicates
    dedupe_key: Mapped[str] = mapped_column(String(80), unique=True)
    complaint: Mapped[Complaint] = relationship(lazy="joined")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity: Mapped[str] = mapped_column(String(40), default="")
    entity_id: Mapped[str] = mapped_column(String(40), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_name: Mapped[str] = mapped_column(String(120), default="System")
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)


class Counter(Base):
    __tablename__ = "counters"
    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, default=0)


class CitizenUser(Base):
    __tablename__ = "citizen_users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(30), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CitizenOTP(Base):
    __tablename__ = "citizen_otps"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(160), index=True)
    otp_code: Mapped[str] = mapped_column(String(6))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)