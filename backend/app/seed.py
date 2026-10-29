"""Seed synthetic demo data. Usage:  python -m app.seed [--reset]
All people, institutions and complaints are fictional."""
import sys
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import today
from .database import Base, SessionLocal, engine
from .models import (Bureau, CaseAssignment, CaseHistory, Complaint, Institution, Role, RoutingRule, User)
from .security import hash_password
from .services import alerts, config_svc, overlap, routing, sla
from .services.audit import audit
from .services.ids import next_value

DEMO_PASSWORD = "Demo@1234"

BASE = ["dashboard:view", "case:read", "institution:read", "report:view"]
ROLES = {
    "admin": ("Full administration, configuration and user management", True,
              BASE + ["case:create", "case:update", "case:status", "case:reopen", "case:assign", "case:note", "document:upload", "link:review",
                      "overlap:scan", "report:export", "institution:write", "alerts:run", "audit:read", "config:manage", "routing:manage", "user:manage"]),
    "supervisor": ("Oversees all bureaus: reassigns, reviews routing and overlaps", True,
                   BASE + ["case:create", "case:update", "case:status", "case:reopen", "case:assign", "case:note", "document:upload", "link:review",
                           "overlap:scan", "report:export", "institution:write", "alerts:run", "audit:read"]),
    "bureau_officer": ("Works cases of their own bureau/cell only", False,
                       BASE + ["case:create", "case:update", "case:status", "case:note", "document:upload", "link:review"]),
    "management": ("Read-only consolidated view and report export", True, BASE + ["report:export"]),
}
BUREAUS = [("TECH", "Technical Bureau", False), ("APPR", "Approval Bureau", False),
           ("SGC", "Student Grievance Cell", False), ("REVIEW", "Manual Review Queue", True)]
USERS = [("admin", "Anita Rao (Admin)", "admin", None), ("supervisor", "Suresh Sharma", "supervisor", None),
         ("kulkarni", "R. Kulkarni", "bureau_officer", "TECH"), ("patil", "N. Patil", "bureau_officer", "TECH"),
         ("deshmukh", "S. Deshmukh", "bureau_officer", "APPR"), ("iyer", "M. Iyer", "bureau_officer", "SGC"),
         ("management", "Dr. Verma (Management)", "management", None)]
INSTS = [
    ("Sahyadri Institute of Technology", "Maharashtra", "Pune", "Engineering", ["SIT Pune", "Sahyadri Inst of Tech"]),
    ("Konkan College of Management", "Maharashtra", "Ratnagiri", "Management", []),
    ("Deccan Polytechnic", "Maharashtra", "Nagpur", "Diploma", []),
    ("Western Ghats School of Pharmacy", "Maharashtra", "Kolhapur", "Pharmacy", ["WGSP"]),
    ("Narmada Engineering College", "Madhya Pradesh", "Indore", "Engineering", []),
    ("Lakeview Institute of Design", "Maharashtra", "Mumbai", "Design", []),
    ("Gangetic Institute of Management Studies", "Uttar Pradesh", "Lucknow", "Management", ["GIMS"]),
    ("Thar Desert College of Engineering", "Rajasthan", "Jodhpur", "Engineering", []),
    ("Malabar Institute of Technology", "Kerala", "Kozhikode", "Engineering", []),
    ("Cauvery Institute of Engineering", "Karnataka", "Mysuru", "Engineering", []),
]
RULES = [("Infrastructure", "TECH"), ("Faculty", "APPR"), ("Affiliation", "APPR"), ("Academic Quality", "APPR"),
         ("Fees", "SGC"), ("Admissions", "SGC")]
# (institution idx, category, subject, description, priority, days_ago, source, final status)
CASES = [
 (0, "Infrastructure", "Computer lab machines outdated", "Computer lab machines are outdated and many are not working for students. Practical sessions are being affected.", "High", 24, "Portal", "In Progress"),
 (0, "Fees", "Excess tuition collected", "Institute is collecting tuition above the approved fee structure from first year students and refusing receipts.", "Medium", 18, "Email", "Open"),
 (1, "Faculty", "Unqualified faculty appointed", "Faculty without the required qualifications are teaching MBA courses and approvals were not displayed.", "Medium", 40, "Letter", "In Progress"),
 (2, "Infrastructure", "Electronics lab equipment broken", "Laboratory equipment in the electronics lab is broken and outdated, and students cannot complete practical experiments.", "Medium", 12, "Portal", "In Progress"),
 (2, "Academic Quality", "Practicals not conducted", "Students are unable to perform practical experiments because the lab machines are faulty and no repair is done.", "Medium", 9, "Email", "Open"),
 (2, "Infrastructure", "Hostel drinking water unavailable", "Hostel has no clean drinking water and sanitation facilities are broken for residents.", "High", 20, "Portal", "Open"),
 (3, "Affiliation", "Course run without approval", "Pharmacy seats were admitted beyond the approved intake without affiliation approval for the new batch.", "High", 55, "Portal", "Under Review"),
 (3, "Admissions", "Donation demanded for admission", "Management demanded a donation for admission seats and issued no receipt.", "Medium", 100, "Email", "Resolved"),
 (3, "Fees", "Fee refund not processed", "Fee refund after admission cancellation has not been processed for months despite repeated requests.", "Low", 35, "Portal", "Open"),
 (4, "Faculty", "Salaries unpaid", "Teaching staff salaries have been pending for four months and several faculty are resigning.", "Low", 20, "Letter", "Open"),
 (4, "Infrastructure", "Library lacks books", "Library holds outdated books and has no digital access for students preparing for exams.", "Low", 13, "Portal", "In Progress"),
 (5, "Other", "Fee refund and hostel seat cancelled", "Complaint mentions a fee refund and a cancelled hostel seat together and is unclear which authority should act.", "Medium", 3, "Email", "Open"),
 (5, "Infrastructure", "Studio equipment missing", "Design studio equipment is missing and facilities are not as promised during admission.", "Medium", 8, "Portal", "Open"),
 (1, "Fees", "Refund delayed", "Fee refund after admission cancellation was not processed for months.", "Low", 70, "Portal", "Resolved"),
 (6, "Academic Quality", "Syllabus not covered", "Syllabus is not being covered in time and many classes are cancelled without replacement.", "Medium", 5, "Portal", "Open"),
 (6, "Faculty", "Faculty shortage", "Department has too few faculty members for the sanctioned intake and classes are cancelled.", "Medium", 6, "Email", "Open"),
 (7, "Fees", "Hidden charges", "Institute levies hidden charges for exams and labs that are not disclosed in the fee structure.", "Medium", 28, "Portal", "Open"),
 (7, "Fees", "Excess exam fees", "Students are being charged excess fees for examinations beyond the approved fee structure.", "Medium", 14, "Portal", "Open"),
 (8, "Infrastructure", "Fire safety missing", "Campus buildings lack functioning fire safety equipment and emergency exits are blocked.", "High", 4, "Phone", "Open"),
 (8, "Affiliation", "Affiliation renewal pending", "Institute continues admitting students although its affiliation renewal is pending.", "High", 11, "Letter", "In Progress"),
 (9, "Admissions", "Seat blocking", "Seats are blocked and sold for capitation outside the official counselling process.", "High", 2, "Portal", "Open"),
 (9, "Fees", "Capitation fee demanded", "Management demands a capitation fee for confirming an admission seat.", "Medium", 10, "Email", "Open"),
 (0, "Faculty", "Visiting faculty not paid", "Visiting faculty have not been paid for two semesters.", "Low", 45, "Letter", "Pending Information"),
 (1, "Infrastructure", "Classrooms leaking", "Classrooms are leaking during the monsoon and the building is unsafe for students.", "Medium", 16, "Portal", "In Progress"),
 (4, "Admissions", "Admission without eligibility", "Students were admitted without meeting the eligibility criteria and entrance requirement.", "Medium", 21, "Email", "Open"),
 (2, "Fees", "Mid-session fee hike", "A sudden fee hike was announced mid-session without notice to students.", "Medium", 7, "Portal", "Open"),
]


def _ts(d):
    return datetime.combine(d, time(10, 0), tzinfo=timezone.utc)


def seed(db: Session) -> None:
    t = today()
    roles = {n: Role(name=n, description=d, all_bureaus=a, permissions=p) for n, (d, a, p) in ROLES.items()}
    db.add_all(roles.values())
    bureaus = {c: Bureau(code=c, name=n, is_review_queue=r, description="Prototype unit" if not r else "Ambiguous cases wait here for manual routing")
               for c, n, r in BUREAUS}
    db.add_all(bureaus.values())
    db.flush()
    users = {}
    for uname, full, role, b in USERS:
        users[uname] = User(username=uname, full_name=full, email=f"{uname}@demo.example", password_hash=hash_password(DEMO_PASSWORD),
                            role_id=roles[role].id, bureau_id=bureaus[b].id if b else None)
        db.add(users[uname])
    for cat, b in RULES:
        db.add(RoutingRule(category=cat, bureau_id=bureaus[b].id))
    insts = []
    for name, state, city, typ, aliases in INSTS:
        i = Institution(code=f"INS-{next_value(db, 'institution'):04d}", name=name, state=state, city=city, inst_type=typ, aliases=aliases,
                        affiliating_body="Demo University", contact_email="office@demo.example", established_year=1990 + len(insts))
        db.add(i)
        insts.append(i)
    db.flush()
    sup = users["supervisor"]
    for inst_idx, cat, subject, desc, prio, ago, src, final in CASES:
        reg = t - timedelta(days=ago)
        inst = insts[inst_idx]
        dec = routing.route(db, cat, inst)
        officer = db.scalars(select(User).where(User.bureau_id == dec.bureau.id).order_by(User.id)).first() if not dec.bureau.is_review_queue else None
        c = Complaint(case_id=f"CMP-{reg.year}-{next_value(db, f'case-{reg.year}'):06d}", institution_id=inst.id, category=cat, subject=subject,
                      description=desc, source=src, priority=prio, status="Open", registered_on=reg, due_date=sla.due_date_for(db, reg, prio),
                      bureau_id=dec.bureau.id, officer_id=officer.id if officer else None, routing_note=dec.note, created_by=sup.id,
                      pending_action="Manual routing review" if dec.manual_review else "Initial review")
        db.add(c)
        db.flush()
        db.add(CaseAssignment(complaint_id=c.id, bureau_id=dec.bureau.id, officer_id=c.officer_id, assigned_by=sup.id, reason=dec.note, assigned_on=_ts(reg)))
        def h(kind, text, day, actor=sup, old=None, new=None):
            db.add(CaseHistory(complaint_id=c.id, event_type=kind, description=text, old_value=old, new_value=new, actor_id=actor.id if actor else None,
                               actor_name=actor.full_name if actor else "System", actor_role=actor.role.name if actor else "system", created_at=_ts(day)))
            c.last_action = text[:250]
        h("registered", f"Case registered via {src}. {dec.note}", reg)
        if final != "Open" and not dec.manual_review:
            step = reg + timedelta(days=min(2, ago))
            h("status", "Status changed Open to In Progress", step, officer or sup, "Open", "In Progress")
            c.status, c.pending_action = "In Progress", "Follow-up"
            if final in ("Under Review", "Pending Information"):
                h("status", f"Status changed In Progress to {final}: awaiting input", step + timedelta(days=1), officer or sup, "In Progress", final)
                c.status = final
            if final == "Resolved":
                end = min(t, reg + timedelta(days=min(12, ago)))
                h("status", "Status changed In Progress to Resolved: action taken and verified", end, officer or sup, "In Progress", "Resolved")
                c.status, c.resolved_on, c.pending_action = "Resolved", end, "None"
    db.flush()
    audit(db, "seed", None, "system", "", "Synthetic demo data loaded")
    overlap.scan_all(db)
    alerts.run_checks(db, t)
    db.commit()


def main():
    reset = "--reset" in sys.argv
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(Role.id).limit(1)):
            print("Database already seeded. Use --reset to rebuild.")
            return
        seed(db)
        print(f"Seeded. Demo password for every user: {DEMO_PASSWORD}")
        print("Users:", ", ".join(u[0] for u in USERS))


if __name__ == "__main__":
    main()
