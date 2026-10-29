import os
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import schemas
from ..config import settings, today
from ..database import get_db
from ..deps import case_scope_filter, get_case_or_404, require
from ..models import (Bureau, CaseAssignment, CaseHistory, CaseLink, Complaint, Document,
                      Institution, User)
from ..services import config_svc, overlap, routing, sla
from ..services.audit import audit, history
from ..services.ids import next_value
from .common import complaint_out, complaints_out

router = APIRouter(prefix="/complaints", tags=["Complaints"])
ALLOWED_EXT = {"pdf", "png", "jpg", "jpeg", "docx", "xlsx", "txt", "csv", "zip"}
SORTS = {"registered_on": Complaint.registered_on, "due_date": Complaint.due_date, "case_id": Complaint.case_id,
         "status": Complaint.status, "priority": Complaint.priority, "category": Complaint.category}


def default_officer(db: Session, bureau: Bureau) -> User | None:
    if bureau.is_review_queue:
        return None
    return db.scalars(select(User).join(User.role).where(User.bureau_id == bureau.id, User.active.is_(True))
                      .order_by(User.id)).first()


@router.post("", response_model=schemas.ComplaintOut, status_code=201)
def register(body: schemas.ComplaintIn, user: User = Depends(require("case:create")), db: Session = Depends(get_db)):
    inst = db.get(Institution, body.institution_id) if body.institution_id else None
    if inst is None and body.institution_code:
        inst = db.scalars(select(Institution).where(Institution.code == body.institution_code)).first()
    if inst is None:
        raise HTTPException(422, "Unknown institution. Provide a valid institution_id or institution_code.")
    if body.category not in config_svc.get(db, "categories"):
        raise HTTPException(422, f"Unknown category. Allowed: {config_svc.get(db, 'categories')}")
    decision = routing.route(db, body.category, inst, body.other_subjects)
    reg = today()
    year_seq = next_value(db, f"case-{reg.year}")
    c = Complaint(case_id=f"CMP-{reg.year}-{year_seq:06d}", institution_id=inst.id, category=body.category,
                  subject=body.subject, description=body.description, source=body.source, priority=body.priority,
                  status="Open", registered_on=reg, due_date=sla.due_date_for(db, reg, body.priority),
                  bureau_id=decision.bureau.id, routing_note=decision.note, created_by=user.id,
                  pending_action="Manual routing review" if decision.manual_review else "Initial review")
    officer = default_officer(db, decision.bureau)
    c.officer_id = officer.id if officer else None
    db.add(c)
    db.flush()
    db.add(CaseAssignment(complaint_id=c.id, bureau_id=decision.bureau.id, officer_id=c.officer_id,
                          assigned_by=user.id, reason=decision.note))
    history(db, c, "registered", f"Case registered via {body.source}. {decision.note}", user)
    audit(db, "case.create", user, "complaint", c.case_id, decision.note)
    created = overlap.scan_complaint(db, c)
    for link in created:
        other = link.case_a if link.case_a_id != c.id else link.case_b
        history(db, c, "link", f"Potential overlap suggested with {other.case_id} (score {link.score:.0%})", None)
    db.commit()
    db.refresh(c)
    out = complaint_out(db, c)
    out.routing_note = decision.note
    return out


@router.get("", response_model=schemas.Page)
def list_cases(q: str = "", institution_id: int | None = None, bureau_id: int | None = None, category: str = "",
               status: str = "", priority: str = "", state: str = "", overdue: bool | None = None, date_from: str = "", date_to: str = "",
               sort: str = "registered_on", order: str = "desc", page: int = Query(1, ge=1), size: int = Query(25, ge=1, le=200),
               user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    stmt = select(Complaint).join(Institution, Complaint.institution_id == Institution.id).where(case_scope_filter(user))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Complaint.case_id).like(like), func.lower(Complaint.subject).like(like),
                              func.lower(Complaint.description).like(like), func.lower(Institution.name).like(like),
                              func.lower(Institution.code).like(like)))
    if institution_id:
        stmt = stmt.where(Complaint.institution_id == institution_id)
    if bureau_id:
        stmt = stmt.where(Complaint.bureau_id == bureau_id)
    if category:
        stmt = stmt.where(Complaint.category == category)
    if status:
        stmt = stmt.where(Complaint.status == status)
    if priority:
        stmt = stmt.where(Complaint.priority == priority)
    if state:
        stmt = stmt.where(Institution.state == state)
    if overdue is True:
        stmt = stmt.where(Complaint.due_date < today(), Complaint.status != "Resolved")
    if date_from:
        stmt = stmt.where(Complaint.registered_on >= date_from)
    if date_to:
        stmt = stmt.where(Complaint.registered_on <= date_to)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    col = SORTS.get(sort, Complaint.registered_on)
    stmt = stmt.order_by(col.desc() if order == "desc" else col.asc(), Complaint.id.desc())
    rows = db.scalars(stmt.offset((page - 1) * size).limit(size)).unique().all()
    return {"items": complaints_out(db, rows), "total": total, "page": page, "size": size}


@router.get("/review-queue", response_model=list[schemas.ComplaintOut])
def review_queue(user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Complaint).join(Bureau, Complaint.bureau_id == Bureau.id)
                      .where(Bureau.is_review_queue.is_(True), Complaint.status != "Resolved", case_scope_filter(user))
                      .order_by(Complaint.registered_on)).unique().all()
    return complaints_out(db, rows)


@router.get("/{case_ref}", response_model=schemas.ComplaintOut)
def get_case(case_ref: str, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    return complaint_out(db, get_case_or_404(db, user, case_ref))


@router.patch("/{case_ref}", response_model=schemas.ComplaintOut)
def update_case(case_ref: str, body: schemas.ComplaintUpdate, user: User = Depends(require("case:update")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    if c.status == "Resolved":
        raise HTTPException(409, "Resolved cases cannot be edited. Reopen the case first.")
    changes = body.model_dump(exclude_unset=True)
    for field, new in changes.items():
        old = getattr(c, field)
        if new == old:
            continue
        setattr(c, field, new)
        history(db, c, "edit", f"{field.replace('_', ' ').capitalize()} changed", user, str(old)[:250], str(new)[:250])
        if field == "priority":
            old_due = c.due_date
            c.due_date = sla.due_date_for(db, c.registered_on, new)
            history(db, c, "edit", f"Due date recalculated from priority ({old_due} to {c.due_date})", user, str(old_due), str(c.due_date))
    audit(db, "case.update", user, "complaint", c.case_id, ", ".join(changes))
    db.commit()
    return complaint_out(db, c)


@router.post("/{case_ref}/status", response_model=schemas.ComplaintOut)
def change_status(case_ref: str, body: schemas.StatusChange, user: User = Depends(require("case:status")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    allowed = config_svc.TRANSITIONS.get(c.status, {})
    if body.to_status not in allowed:
        raise HTTPException(409, f"Transition {c.status} -> {body.to_status} is not permitted. Allowed: {sorted(allowed) or 'none'}")
    if not user.has(allowed[body.to_status]):
        audit(db, "access.denied", user, "complaint", c.case_id, f"status {c.status}->{body.to_status}", success=False)
        db.commit()
        raise HTTPException(403, f"Permission required: {allowed[body.to_status]}")
    if (body.to_status in config_svc.NOTE_REQUIRED or c.status == "Resolved") and len(body.note.strip()) < 5:
        raise HTTPException(422, "A note of at least 5 characters is required for this transition.")
    old = c.status
    c.status = body.to_status
    c.resolved_on = today() if body.to_status == "Resolved" else None
    c.pending_action = {"Resolved": "None", "Pending Information": "Awaiting information from institution"}.get(body.to_status, "Follow-up")
    history(db, c, "status", f"Status changed {old} to {body.to_status}" + (f": {body.note.strip()}" if body.note.strip() else ""),
            user, old, body.to_status)
    audit(db, "case.status", user, "complaint", c.case_id, f"{old} -> {body.to_status}")
    db.commit()
    return complaint_out(db, c)


@router.post("/{case_ref}/assign", response_model=schemas.ComplaintOut)
def assign(case_ref: str, body: schemas.AssignIn, user: User = Depends(require("case:assign")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    bureau = db.get(Bureau, body.bureau_id)
    if not bureau or not bureau.active:
        raise HTTPException(422, "Unknown or inactive bureau/cell")
    officer = None
    if body.officer_id:
        officer = db.get(User, body.officer_id)
        if not officer or not officer.active or officer.bureau_id != bureau.id:
            raise HTTPException(422, "Officer must be an active member of the chosen bureau/cell")
    else:
        officer = default_officer(db, bureau)
    old_b, old_o = c.bureau.name, c.officer.full_name if c.officer else "Unassigned"
    current = db.scalars(select(CaseAssignment).where(CaseAssignment.complaint_id == c.id, CaseAssignment.released_on.is_(None))).all()
    from ..models import utcnow
    for a in current:
        a.released_on = utcnow()
    c.bureau_id = bureau.id
    c.officer_id = officer.id if officer else None
    db.add(CaseAssignment(complaint_id=c.id, bureau_id=bureau.id, officer_id=c.officer_id, assigned_by=user.id, reason=body.reason))
    db.flush()
    db.refresh(c)
    if not bureau.is_review_queue:
        c.pending_action = "Initial review" if c.status == "Open" else c.pending_action
        c.routing_note = f"Assigned to {bureau.name} by {user.full_name}"
    new_o = officer.full_name if officer else "Unassigned"
    history(db, c, "assignment", f"Reassigned from {old_b} ({old_o}) to {bureau.name} ({new_o}): {body.reason}", user, old_b, bureau.name)
    audit(db, "case.assign", user, "complaint", c.case_id, f"{old_b} -> {bureau.name}: {body.reason}")
    db.commit()
    db.refresh(c)
    return complaint_out(db, c)


@router.post("/{case_ref}/notes", response_model=schemas.HistoryOut, status_code=201)
def add_note(case_ref: str, body: schemas.NoteIn, user: User = Depends(require("case:note")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    history(db, c, "note", f"Note: {body.note.strip()}", user)
    audit(db, "case.note", user, "complaint", c.case_id)
    db.commit()
    return db.scalars(select(CaseHistory).where(CaseHistory.complaint_id == c.id).order_by(CaseHistory.id.desc())).first()


@router.get("/{case_ref}/history", response_model=list[schemas.HistoryOut])
def get_history(case_ref: str, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    return db.scalars(select(CaseHistory).where(CaseHistory.complaint_id == c.id).order_by(CaseHistory.id)).all()


@router.get("/{case_ref}/assignments", response_model=list[schemas.AssignmentOut])
def get_assignments(case_ref: str, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    return db.scalars(select(CaseAssignment).where(CaseAssignment.complaint_id == c.id).order_by(CaseAssignment.id)).all()


@router.get("/{case_ref}/documents", response_model=list[schemas.DocumentOut])
def list_documents(case_ref: str, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    return db.scalars(select(Document).where(Document.complaint_id == c.id).order_by(Document.id)).all()


@router.post("/{case_ref}/documents", response_model=schemas.DocumentOut, status_code=201)
async def upload_document(case_ref: str, file: UploadFile = File(...), user: User = Depends(require("document:upload")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", os.path.basename(file.filename or "file"))[:120]
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, f"File type .{ext} not allowed. Allowed: {sorted(ALLOWED_EXT)}")
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_upload_mb} MB")
    os.makedirs(settings.upload_dir, exist_ok=True)
    stored = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(settings.upload_dir, stored), "wb") as fh:
        fh.write(data)
    doc = Document(complaint_id=c.id, filename=name, stored_name=stored, content_type=file.content_type or "", size_bytes=len(data), uploaded_by=user.id)
    db.add(doc)
    history(db, c, "document", f"Document attached: {name}", user)
    audit(db, "case.document", user, "complaint", c.case_id, name)
    db.commit()
    return doc


@router.delete("/{case_ref}/documents/{doc_id}")
def remove_document(case_ref: str, doc_id: int, user: User = Depends(require("document:upload")), db: Session = Depends(get_db)):
    """Remove a document that was attached by mistake. The removal is recorded in the case history and audit trail."""
    c = get_case_or_404(db, user, case_ref)
    doc = db.get(Document, doc_id)
    if not doc or doc.complaint_id != c.id:
        raise HTTPException(404, "Document not found")
    path = os.path.join(settings.upload_dir, os.path.basename(doc.stored_name))
    name = doc.filename
    if c.photo_url and doc.stored_name in c.photo_url:
        c.photo_url = None
    db.delete(doc)
    history(db, c, "document", f"Document removed: {name}", user)
    audit(db, "case.document.remove", user, "complaint", c.case_id, name)
    db.commit()
    try:  # delete the stored file only after the database change is safely committed
        os.remove(path)
    except OSError:
        pass
    return {"ok": True, "removed": name}


@router.get("/documents/{stored_name}")
def get_raw_document(stored_name: str):
    clean_name = os.path.basename(stored_name)
    path = os.path.join(settings.upload_dir, clean_name)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")
    return FileResponse(path)


@router.get("/{case_ref}/documents/{doc_id}/download")
def download_document(case_ref: str, doc_id: int, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    c = get_case_or_404(db, user, case_ref)
    doc = db.get(Document, doc_id)
    if not doc or doc.complaint_id != c.id:
        raise HTTPException(404, "Document not found")
    return FileResponse(os.path.join(settings.upload_dir, doc.stored_name), filename=doc.filename)


@router.get("/{case_ref}/overlaps")
def case_overlaps(case_ref: str, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    from .overlaps import link_out
    c = get_case_or_404(db, user, case_ref)
    links = db.scalars(select(CaseLink).where((CaseLink.case_a_id == c.id) | (CaseLink.case_b_id == c.id)).order_by(CaseLink.score.desc())).all()
    return [link_out(l, user) for l in links]