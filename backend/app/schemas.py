from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Priority = Literal["High", "Medium", "Low"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth / users
class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RoleOut(ORM):
    id: int
    name: str
    description: str
    all_bureaus: bool
    permissions: list[str]


class BureauOut(ORM):
    id: int
    code: str
    name: str
    description: str = ""
    is_review_queue: bool = False
    active: bool = True


class UserOut(ORM):
    id: int
    username: str
    full_name: str
    email: str = ""
    active: bool = True
    role: RoleOut
    bureau: BureauOut | None = None


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    full_name: str = Field(min_length=2, max_length=120)
    email: str = ""
    password: str = Field(min_length=8, max_length=72)
    role_id: int
    bureau_id: int | None = None


# ---- institutions
class InstitutionIn(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    aliases: list[str] = []
    inst_type: str = ""
    state: str = ""
    city: str = ""
    affiliating_body: str = ""
    contact_email: str = ""
    established_year: int | None = Field(default=None, ge=1800, le=2100)
    confirm_distinct: bool = False  # caller verified this is not a duplicate of a listed match


class InstitutionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=255)
    aliases: list[str] | None = None
    inst_type: str | None = None
    state: str | None = None
    city: str | None = None
    affiliating_body: str | None = None
    contact_email: str | None = None
    established_year: int | None = Field(default=None, ge=1800, le=2100)
    status: str | None = None


class InstitutionOut(ORM):
    id: int
    code: str
    name: str
    aliases: list[str] = []
    inst_type: str = ""
    state: str = ""
    city: str = ""
    affiliating_body: str = ""
    contact_email: str = ""
    established_year: int | None = None
    status: str = "Active"


class InstitutionMatch(BaseModel):
    institution: InstitutionOut
    confidence: float
    reason: str


# ---- complaints
class ComplaintIn(BaseModel):
    institution_id: int | None = None
    institution_code: str | None = None
    category: str
    subject: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    source: str = "Portal"
    priority: Priority = "Medium"
    other_subjects: list[str] = []  # extra subjects mentioned -> forces manual review

    @field_validator("institution_code")
    @classmethod
    def _norm(cls, v):
        return v.strip().upper() if v else v


class ComplaintUpdate(BaseModel):
    subject: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=10)
    priority: Priority | None = None
    pending_action: str | None = Field(default=None, max_length=255)


class StatusChange(BaseModel):
    to_status: str
    note: str = ""


class AssignIn(BaseModel):
    bureau_id: int
    officer_id: int | None = None
    reason: str = Field(min_length=5, max_length=500)


class NoteIn(BaseModel):
    note: str = Field(min_length=2, max_length=2000)


class SlaOut(BaseModel):
    state: str
    days_left: int | None
    age_days: int


class ComplaintOut(ORM):
    id: int
    case_id: str
    institution: InstitutionOut
    category: str
    subject: str
    description: str
    source: str
    priority: str
    status: str
    registered_on: date
    due_date: date
    bureau: BureauOut
    officer: UserOut | None = None
    last_action: str
    pending_action: str
    routing_note: str = ""
    resolved_on: date | None = None
    sla: SlaOut | None = None
    document_count: int = 0


class HistoryOut(ORM):
    id: int
    event_type: str
    description: str
    old_value: str | None = None
    new_value: str | None = None
    actor_name: str
    actor_role: str
    created_at: datetime


class AssignmentOut(ORM):
    id: int
    bureau: BureauOut
    officer: UserOut | None = None
    reason: str
    assigned_on: datetime
    released_on: datetime | None = None


class DocumentOut(ORM):
    id: int
    filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class Page(BaseModel):
    items: list
    total: int
    page: int
    size: int


# ---- overlaps
class LinkDecision(BaseModel):
    decision: Literal["link", "dismiss", "unlink"]
    reason: str = Field(min_length=5, max_length=1000)


class ManualLinkIn(BaseModel):
    case_a: str
    case_b: str
    reason: str = Field(min_length=5, max_length=1000)


# ---- admin
class RoutingRuleIn(BaseModel):
    category: str
    state: str | None = None
    bureau_id: int
    is_verified: bool = False
    source_note: str = "Prototype rule - not verified against official AICTE procedure"
    active: bool = True


class ConfigIn(BaseModel):
    sla_days: dict[str, int] | None = None
    warn_days: int | None = Field(default=None, ge=0, le=60)
    escalation_days: int | None = Field(default=None, ge=1, le=120)
    overlap_threshold: float | None = Field(default=None, ge=0.1, le=0.95)
    overlap_window_days: int | None = Field(default=None, ge=1, le=365)


TokenOut.model_rebuild()
