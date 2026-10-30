import base64
import os
import random
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings, today
from ..database import get_db
from ..deps import current_citizen
from ..models import (Bureau, CaseAssignment, CaseHistory, Complaint, Document,
                      Institution, User, CitizenUser, CitizenOTP)
from ..security import create_citizen_token
from ..services import config_svc, overlap, routing, sla
from ..services.audit import audit, history
from ..services.ids import next_value
from ..services.resend_svc import send_otp_email

router = APIRouter(prefix="/citizen", tags=["Citizen Mobile Portal"])

ALLOWED_DOC_EXT = {"pdf", "png", "jpg", "jpeg", "docx", "txt"}
ALLOWED_PHOTO_EXT = {"png", "jpg", "jpeg", "webp"}


# --- Pydantic Schemas for Citizen ---
class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp_code: str
    full_name: str | None = None
    phone: str | None = None


class CitizenComplaintIn(BaseModel):
    institution_id: int
    category: str
    subject: str
    description: str
    is_urgent: bool = False
    geo_latitude: float | None = None
    geo_longitude: float | None = None
    geo_address: str | None = None
    photo_base64: str | None = None
    photo_name: str | None = None
    document_base64: str | None = None
    document_name: str | None = None


# --- Authentication Endpoints ---

@router.post("/auth/send-otp")
def send_otp(req: SendOtpRequest, db: Session = Depends(get_db)):
    """Generate and dispatch a 6-digit OTP code to the citizen's email via Resend."""
    email = req.email.strip().lower()
    otp_code = f"{random.randint(100000, 999999)}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Invalidate previous unexpired OTPs for this email
    prev = db.scalars(select(CitizenOTP).where(CitizenOTP.email == email, CitizenOTP.used.is_(False))).all()
    for o in prev:
        o.used = True

    otp_record = CitizenOTP(email=email, otp_code=otp_code, expires_at=expires, used=False)
    db.add(otp_record)
    db.commit()

    # Send via configured provider (SMTP -> Resend -> local simulation)
    result = send_otp_email(email, otp_code)
    status_ = result.get("status")

    if status_ == "sent":
        resp = {"success": True, "message": f"Verification code sent to {email}"}
        if settings.otp_debug_fallback:
            resp["debug_otp"] = otp_code
        return resp

    if status_ == "simulated":
        # No email provider configured: local dev only
        return {
            "success": True,
            "message": f"Verification code generated for {email}",
            "debug_otp": otp_code,
            "note": "No email provider configured; OTP included for local testing.",
        }

    # Real delivery failed. Do NOT leak the OTP unless explicitly enabled for dev.
    if settings.otp_debug_fallback:
        return {
            "success": True,
            "message": f"Email delivery failed; using dev fallback for {email}",
            "debug_otp": otp_code,
            "note": "Email delivery failed; OTP included because OTP_DEBUG_FALLBACK=true.",
        }
    raise HTTPException(
        status.HTTP_502_BAD_GATEWAY,
        "Could not send the verification email right now. Please try again in a moment.",
    )


@router.post("/auth/verify-otp")
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify OTP and authenticate or register citizen user."""
    email = req.email.strip().lower()
    code = req.otp_code.strip()

    now = datetime.now(timezone.utc)
    otp_record = db.scalars(
        select(CitizenOTP)
        .where(CitizenOTP.email == email, CitizenOTP.otp_code == code)
        .order_by(CitizenOTP.id.desc())
    ).first()

    if not otp_record:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification code.")

    exp = otp_record.expires_at if otp_record.expires_at.tzinfo else otp_record.expires_at.replace(tzinfo=timezone.utc)
    if exp < now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification code has expired. Please request a new code.")

    otp_record.used = True

    # Find or create citizen user
    citizen = db.scalars(select(CitizenUser).where(CitizenUser.email == email)).first()
    if not citizen:
        citizen = CitizenUser(email=email, full_name=(req.full_name or "").strip(), phone=(req.phone or "").strip())
        db.add(citizen)
    else:
        if req.full_name and req.full_name.strip():
            citizen.full_name = req.full_name.strip()
        if req.phone and req.phone.strip():
            citizen.phone = req.phone.strip()

    citizen.last_login = now
    db.commit()
    db.refresh(citizen)

    token = create_citizen_token(citizen.id, citizen.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "citizen": {
            "id": citizen.id,
            "email": citizen.email,
            "full_name": citizen.full_name,
            "phone": citizen.phone,
        }
    }


@router.get("/auth/me")
def get_me(citizen: CitizenUser = Depends(current_citizen)):
    """Return currently authenticated citizen profile."""
    return {
        "id": citizen.id,
        "email": citizen.email,
        "full_name": citizen.full_name,
        "phone": citizen.phone,
        "created_at": citizen.created_at.isoformat() if citizen.created_at else None,
    }


# --- Metadata Endpoints ---

@router.get("/institutions")
def list_institutions(q: str = "", state: str = "", db: Session = Depends(get_db)):
    """Get active institutions for mobile selection with search filtering."""
    stmt = select(Institution).where(Institution.status == "Active")
    if state:
        stmt = stmt.where(Institution.state == state)
    if q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(Institution.name.ilike(term) | Institution.code.ilike(term) | Institution.city.ilike(term))
    institutions = db.scalars(stmt.order_by(Institution.name).limit(50)).all()
    return [
        {
            "id": inst.id,
            "code": inst.code,
            "name": inst.name,
            "city": inst.city,
            "state": inst.state,
            "inst_type": inst.inst_type
        }
        for inst in institutions
    ]


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """Return complaint categories configured in AICTE system."""
    cats = config_svc.get(db, "categories")
    return {"categories": cats}


# --- Complaint Registration & Management ---

def _default_officer(db: Session, bureau: Bureau) -> User | None:
    if bureau.is_review_queue:
        return None
    return db.scalars(select(User).join(User.role).where(User.bureau_id == bureau.id, User.active.is_(True))
                      .order_by(User.id)).first()


@router.post("/complaints")
def create_complaint(
    req: CitizenComplaintIn,
    citizen: CitizenUser = Depends(current_citizen),
    db: Session = Depends(get_db),
):
    """File a complaint from the citizen mobile application."""
    inst = db.get(Institution, req.institution_id)
    if not inst:
        raise HTTPException(422, "Institution not found.")

    allowed_cats = config_svc.get(db, "categories")
    if req.category not in allowed_cats:
        raise HTTPException(422, f"Unknown category '{req.category}'. Allowed: {allowed_cats}")

    if len(req.subject.strip()) < 3:
        raise HTTPException(422, "Subject must be at least 3 characters.")
    if len(req.description.strip()) < 10:
        raise HTTPException(422, "Description must be at least 10 characters.")

    decision = routing.route(db, req.category, inst, None)
    reg = today()
    year_seq = next_value(db, f"case-{reg.year}")
    case_id = f"CMP-{reg.year}-{year_seq:06d}"

    # If marked urgent, escalate priority to High
    priority = "High" if req.is_urgent else "Medium"
    due = sla.due_date_for(db, reg, priority)

    c = Complaint(
        case_id=case_id,
        institution_id=inst.id,
        category=req.category,
        subject=req.subject.strip(),
        description=req.description.strip(),
        source="Mobile App",
        priority=priority,
        status="Open",
        registered_on=reg,
        due_date=due,
        bureau_id=decision.bureau.id,
        routing_note=decision.note,
        pending_action="Manual routing review" if decision.manual_review else "Initial review",
        complainant_email=citizen.email,
        complainant_name=citizen.full_name,
        complainant_phone=citizen.phone,
        is_urgent=bool(req.is_urgent),
        geo_latitude=req.geo_latitude,
        geo_longitude=req.geo_longitude,
        geo_address=(req.geo_address or "").strip()[:250] if req.geo_address else None,
    )

    officer = _default_officer(db, decision.bureau)
    c.officer_id = officer.id if officer else None
    db.add(c)
    db.flush()

    db.add(CaseAssignment(
        complaint_id=c.id,
        bureau_id=decision.bureau.id,
        officer_id=c.officer_id,
        assigned_by=None,
        reason=decision.note
    ))

    reg_note = f"Case registered via Citizen Mobile App by {citizen.email} ({citizen.full_name or 'Citizen'}). {decision.note}"
    if req.is_urgent:
        reg_note += " [URGENT FLAG ATTACHED]"
    if req.geo_latitude and req.geo_longitude:
        reg_note += f" [Geotag: {req.geo_latitude:.4f}, {req.geo_longitude:.4f}]"

    db.add(CaseHistory(
        complaint_id=c.id,
        event_type="registered",
        description=reg_note,
        actor_name=citizen.full_name or citizen.email,
        actor_role="Citizen",
        created_at=datetime.now(timezone.utc)
    ))

    os.makedirs(settings.upload_dir, exist_ok=True)

    # Save optional geotag photo from base64
    if req.photo_base64:
        raw_name = req.photo_name or "photo.jpg"
        ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else "jpg"
        if ext not in ALLOWED_PHOTO_EXT:
            ext = "jpg"
        try:
            b64_str = req.photo_base64
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            data = base64.b64decode(b64_str)
            if len(data) <= settings.max_upload_mb * 1024 * 1024:
                stored = f"geo_{uuid.uuid4().hex}.{ext}"
                with open(os.path.join(settings.upload_dir, stored), "wb") as f:
                    f.write(data)
                c.photo_url = f"/complaints/documents/{stored}"
                doc = Document(
                    complaint_id=c.id,
                    filename=f"Geotag_Photo.{ext}",
                    stored_name=stored,
                    content_type=f"image/{ext}",
                    size_bytes=len(data)
                )
                db.add(doc)
                db.add(CaseHistory(
                    complaint_id=c.id,
                    event_type="document",
                    description=f"Attached geotagged site photo ({doc.filename})",
                    actor_name=citizen.full_name or citizen.email,
                    actor_role="Citizen",
                    created_at=datetime.now(timezone.utc)
                ))
        except Exception as e:
            print(f"Error saving base64 photo: {e}")

    # Save optional supporting document from base64
    if req.document_base64:
        raw_name = req.document_name or "document.pdf"
        clean_name = re.sub(r"[^A-Za-z0-9._ -]", "_", raw_name)[:120]
        ext = clean_name.rsplit(".", 1)[-1].lower() if "." in clean_name else "pdf"
        try:
            b64_str = req.document_base64
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            data = base64.b64decode(b64_str)
            if len(data) <= settings.max_upload_mb * 1024 * 1024:
                stored = f"doc_{uuid.uuid4().hex}.{ext}"
                with open(os.path.join(settings.upload_dir, stored), "wb") as f:
                    f.write(data)
                doc = Document(
                    complaint_id=c.id,
                    filename=clean_name,
                    stored_name=stored,
                    content_type="application/octet-stream",
                    size_bytes=len(data)
                )
                db.add(doc)
                db.add(CaseHistory(
                    complaint_id=c.id,
                    event_type="document",
                    description=f"Uploaded supporting document ({doc.filename})",
                    actor_name=citizen.full_name or citizen.email,
                    actor_role="Citizen",
                    created_at=datetime.now(timezone.utc)
                ))
        except Exception as e:
            print(f"Error saving base64 document: {e}")

    db.flush()
    # Run overlap scan
    overlap.scan_complaint(db, c)
    audit(db, "case.create_citizen", None, "complaint", c.case_id, f"Registered by citizen {citizen.email}")
    db.commit()
    db.refresh(c)

    return {
        "success": True,
        "case_id": c.case_id,
        "id": c.id,
        "status": c.status,
        "bureau": c.bureau.name,
        "registered_on": c.registered_on.isoformat(),
        "due_date": c.due_date.isoformat(),
        "priority": c.priority,
        "is_urgent": c.is_urgent,
        "message": f"Complaint successfully filed with Case ID {c.case_id}"
    }


@router.get("/my-complaints")
def list_my_complaints(citizen: CitizenUser = Depends(current_citizen), db: Session = Depends(get_db)):
    """List all complaints filed by the current citizen."""
    stmt = (
        select(Complaint)
        .where(Complaint.complainant_email == citizen.email)
        .order_by(Complaint.id.desc())
    )
    cases = db.scalars(stmt).all()
    out = []
    for c in cases:
        out.append({
            "id": c.id,
            "case_id": c.case_id,
            "institution_name": c.institution.name,
            "institution_code": c.institution.code,
            "category": c.category,
            "subject": c.subject,
            "description": c.description,
            "priority": c.priority,
            "is_urgent": bool(c.is_urgent),
            "status": c.status,
            "registered_on": c.registered_on.isoformat() if c.registered_on else None,
            "due_date": c.due_date.isoformat() if c.due_date else None,
            "bureau": c.bureau.name,
            "last_action": c.last_action,
            "pending_action": c.pending_action,
            "geo_latitude": c.geo_latitude,
            "geo_longitude": c.geo_longitude,
            "geo_address": c.geo_address,
            "photo_url": c.photo_url,
        })
    return out


@router.get("/track/{case_ref}")
def track_complaint(case_ref: str, db: Session = Depends(get_db)):
    """Public tracking endpoint to track a complaint by Case ID."""
    stmt = select(Complaint).where(Complaint.case_id == case_ref.strip().upper())
    c = db.scalars(stmt).first()
    if not c and case_ref.strip().isdigit():
        c = db.get(Complaint, int(case_ref.strip()))

    if not c:
        raise HTTPException(404, f"Complaint case '{case_ref}' not found.")

    history_records = db.scalars(
        select(CaseHistory)
        .where(CaseHistory.complaint_id == c.id)
        .order_by(CaseHistory.created_at.asc())
    ).all()

    docs = db.scalars(
        select(Document)
        .where(Document.complaint_id == c.id)
        .order_by(Document.id.asc())
    ).all()

    return {
        "id": c.id,
        "case_id": c.case_id,
        "institution_name": c.institution.name,
        "institution_code": c.institution.code,
        "institution_city": c.institution.city,
        "institution_state": c.institution.state,
        "category": c.category,
        "subject": c.subject,
        "description": c.description,
        "priority": c.priority,
        "is_urgent": bool(c.is_urgent),
        "status": c.status,
        "registered_on": c.registered_on.isoformat() if c.registered_on else None,
        "due_date": c.due_date.isoformat() if c.due_date else None,
        "bureau_name": c.bureau.name,
        "last_action": c.last_action,
        "pending_action": c.pending_action,
        "geo_latitude": c.geo_latitude,
        "geo_longitude": c.geo_longitude,
        "geo_address": c.geo_address,
        "photo_url": c.photo_url,
        "history": [
            {
                "id": h.id,
                "event_type": h.event_type,
                "description": h.description,
                "actor_name": h.actor_name,
                "actor_role": h.actor_role,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in history_records
        ],
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "size_bytes": d.size_bytes,
                "download_url": f"/complaints/documents/{d.stored_name}"
            }
            for d in docs
        ]
    }