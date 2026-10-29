from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import case_scope_filter, require
from ..models import Complaint, Institution, User
from ..services import institution_match
from ..services.audit import audit
from ..services.ids import next_value
from .common import complaints_out

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("", response_model=schemas.Page)
def list_institutions(q: str = "", state: str = "", page: int = Query(1, ge=1), size: int = Query(50, ge=1, le=200),
                      user: User = Depends(require("institution:read")), db: Session = Depends(get_db)):
    stmt = select(Institution)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Institution.name).like(like), func.lower(Institution.code).like(like),
                              func.lower(Institution.city).like(like)))
    if state:
        stmt = stmt.where(Institution.state == state)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Institution.name).offset((page - 1) * size).limit(size)).all()
    counts = dict(db.execute(select(Complaint.institution_id, func.count(Complaint.id)).where(case_scope_filter(user))
                             .group_by(Complaint.institution_id)).all())
    items = [{**schemas.InstitutionOut.model_validate(i).model_dump(), "case_count": counts.get(i.id, 0)} for i in rows]
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/resolve", response_model=list[schemas.InstitutionMatch])
def resolve(name: str, user: User = Depends(require("institution:read")), db: Session = Depends(get_db)):
    """Name-based lookup. Results are candidates only: verify before relying on them."""
    found = institution_match.find_matches(db.scalars(select(Institution)).all(), name)
    return [schemas.InstitutionMatch(institution=schemas.InstitutionOut.model_validate(i), confidence=c, reason=r) for i, c, r in found]


@router.post("", response_model=schemas.InstitutionOut, status_code=201)
def create_institution(body: schemas.InstitutionIn, user: User = Depends(require("institution:write")), db: Session = Depends(get_db)):
    matches = institution_match.find_matches(db.scalars(select(Institution)).all(), body.name, min_conf=0.75)
    if matches and not body.confirm_distinct:
        raise HTTPException(409, detail={
            "message": "Possible duplicate institution. Verify identity, then resend with confirm_distinct=true if it is a different institution.",
            "matches": [{"code": i.code, "name": i.name, "confidence": c, "reason": r} for i, c, r in matches]})
    inst = Institution(code=f"INS-{next_value(db, 'institution'):04d}", **body.model_dump(exclude={"confirm_distinct"}))
    db.add(inst)
    db.flush()
    audit(db, "institution.create", user, "institution", inst.code, inst.name)
    db.commit()
    return inst


@router.get("/{inst_id}")
def get_institution(inst_id: int, user: User = Depends(require("institution:read")), db: Session = Depends(get_db)):
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "Institution not found")
    visible = db.scalar(select(func.count(Complaint.id)).where(Complaint.institution_id == inst_id, case_scope_filter(user)))
    total = db.scalar(select(func.count(Complaint.id)).where(Complaint.institution_id == inst_id))
    return {**schemas.InstitutionOut.model_validate(inst).model_dump(), "case_count": visible, "outside_scope_count": total - visible}


@router.patch("/{inst_id}", response_model=schemas.InstitutionOut)
def update_institution(inst_id: int, body: schemas.InstitutionUpdate, user: User = Depends(require("institution:write")), db: Session = Depends(get_db)):
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "Institution not found")
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(inst, k, v)
    audit(db, "institution.update", user, "institution", inst.code, ", ".join(changes))
    db.commit()
    return inst


@router.get("/{inst_id}/cases")
def institution_cases(inst_id: int, user: User = Depends(require("case:read")), db: Session = Depends(get_db)):
    """Consolidated institution-wise view across bureaus, limited to the caller's scope."""
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "Institution not found")
    rows = db.scalars(select(Complaint).where(Complaint.institution_id == inst_id, case_scope_filter(user))
                      .order_by(Complaint.registered_on.desc(), Complaint.id.desc())).all()
    by_bureau: dict[str, int] = {}
    for c in rows:
        by_bureau[c.bureau.name] = by_bureau.get(c.bureau.name, 0) + 1
    total = db.scalar(select(func.count(Complaint.id)).where(Complaint.institution_id == inst_id))
    return {"items": complaints_out(db, rows), "by_bureau": by_bureau, "outside_scope_count": total - len(rows)}
