# AICTE Integrated Complaint Monitoring Dashboard (PS 26264)

One institution-wise view of complaint cases across AICTE bureaus and cells, with role-based access, configurable routing,
explainable overlap detection, deadline alerts, audit trail, dashboards and exports, plus an Expo mobile application for citizen grievance lodging and real-time tracking. **All demo data is synthetic.**

| Layer | Technology |
|---|---|
| Web Frontend | React 18, React Router 6, Tailwind CSS 3, Axios, Recharts, Vite (light and dark themes) |
| Mobile App | React Native 0.88, Expo SDK 58, Expo Location (GPS geotagging), Image Picker, Document Picker, Lucide/Ionicons |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, JWT (python-jose), bcrypt, Resend Email API |
| Database | SQLite / PostgreSQL 16 (tests run on SQLite and PostgreSQL) |
| Overlap detection | Rules + TF-IDF with a synonym vocabulary; optional sentence embeddings |
| Testing | Pytest (43 tests), Postman collection, labelled overlap evaluation |

## Quick start (Docker)
```bash
docker compose up --build        # PostgreSQL + API (auto-seeded) + frontend
# Web: http://localhost:5173     API docs: http://localhost:8000/docs
```

## Quick start (manual)
```bash
# 1. database
createdb aicte_complaints         # or: docker run -e POSTGRES_USER=aicte -e POSTGRES_PASSWORD=aicte -e POSTGRES_DB=aicte_complaints -p 5432:5432 postgres:16
# (or use SQLite by setting DATABASE_URL=sqlite:///./aicte.db in backend/.env)

# 2. backend
cd backend
python -m venv .venv && source .venv/bin/activate # (on Windows: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
cp .env.example .env              # edit DATABASE_URL / SECRET_KEY / RESEND_API_KEY if needed
python -m app.seed --reset        # synthetic institutions, users, complaints
uvicorn app.main:app --reload --reload-dir app     # http://localhost:8000/docs

# 3. web frontend (new terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173

# 4. mobile application (new terminal)
cd mobile
npm install
npx expo start -c --tunnel        # scan the generated QR code in Expo Go app on your phone
```

## Mobile Application (Citizen Grievance Portal)
The `mobile/` directory contains an Expo SDK 58 mobile app built for citizens, students, and faculty:
* **Passwordless Email OTP Authentication**: Citizen identity verification via Resend Email API (with console preview fallback in offline/dev mode).
* **Geotagged Photo Evidence**: Optional field photo capture with automatic GPS coordinates (latitude/longitude) and reverse-geocoded physical address.
* **Document Attachment**: Optional PDF/document upload support using Base64 JSON encoding.
* **Urgent Priority Flag**: Allows flagging critical complaints directly from the field.
* **Real-time Case Tracking**: Any citizen can input a Case ID (`CMP-YYYY-XXXXXX`) to view handling bureau, urgent status, and full chronological lifecycle without logging in.
* **Data Provenance**: Public complaints originate exclusively from authenticated citizens; internal staff (Admin, Supervisor, Officers) review, route, investigate, and resolve cases without tampering with original complaint intake.

## Demo accounts (password `Demo@1234`)
| Username | Role | Scope |
|---|---|---|
| `admin` | Admin | everything, configuration, users, routing rules |
| `supervisor` | Supervisor | all bureaus, reassign, review routing and overlaps, export |
| `kulkarni`, `patil` | Technical Bureau officers | Technical Bureau cases only |
| `deshmukh` | Approval Bureau officer | Approval Bureau cases only |
| `iyer` | Student Grievance Cell officer | Grievance Cell cases only |
| `management` | Management | all data, read-only, can export |

`FIXED_TODAY=2026-10-23` in `.env` freezes the clock so ageing and overdue figures are the same at every demo. Remove it to use the real date.

## Tests
```bash
cd backend
pytest                                                       # SQLite, ~20 s
TEST_DATABASE_URL=postgresql+psycopg2://aicte:aicte@localhost/aicte_test pytest   # real PostgreSQL
python -m scripts.eval_overlap                               # overlap precision/recall on the labelled set
```
Import `postman/AICTE_Complaint_Monitor.postman_collection.json`, run one of the **Login** requests first (the token is stored automatically).

## Offline backup for the demo
`demo_backup/` holds a JSON export of the seeded data and configuration. `python -m app.seed --reset` rebuilds the identical dataset from
code with no network access. `python -m scripts.backup` refreshes the export; `GET /admin/export` (admin) returns the same JSON.

## Project layout
```
backend/app/        models.py schemas.py deps.py (authorisation) routers/ (complaints, citizen, dashboard, reports, etc.) services/ (routing, overlap, sla, alerts, resend_svc) seed.py
backend/tests/      43 tests + labelled overlap pairs        backend/scripts/  eval_overlap, backup, make_postman
frontend/src/       pages/ (Dashboard, Cases, CaseDetail, Institutions, Overlaps, Routing, Alerts, Reports, Audit, Admin) ui.jsx theme.jsx
mobile/             React Native / Expo SDK 58 app (AuthScreen, NewComplaintScreen, TrackCaseScreen, MyComplaintsScreen, ProfileScreen)
docs/               TRACEABILITY.md  OVERLAP_EVALUATION.md  DEMO_SCRIPT.md  MOBILE_APP.md
```

## How the key requirements are met
* **Backend-enforced access.** Every route depends on `require(permission)`; case access is also scoped by bureau (`deps.py`). Out-of-scope cases return 404, so their existence is not leaked. Denied attempts are written to the audit trail. Hiding buttons in the UI is only cosmetic.
* **Routing never guesses.** Rules are data (`routing_rules`), flagged *Prototype* until an admin marks them *Verified*. Multiple subjects, no matching rule, or conflicting rules send the case to the Manual Review queue.
* **Overlap is advisory.** Same institution ID is a hard gate, then category, text and timing signals build an explained score. Link/dismiss/unlink need a reason, are recorded in both case histories and the audit trail, and never merge or close cases. Dismissed pairs do not resurface.
* **History is append-only.** Edits, status changes, reassignments, notes, links and alerts add rows to `case_history` with actor, role and timestamp; assignments keep every previous row.
* **Alerts are de-duplicated** by a unique `(case, kind, due date)` key, so repeated checks cannot spam. Pending (due soon), overdue and escalated are distinct states with configurable thresholds.

## Known limitations (be upfront in the demo)
* Routing rules are demonstration rules and must be verified against official AICTE procedure before real use.
* Overlap quality: see `docs/OVERLAP_EVALUATION.md` (small developer-written test set; embeddings option is untested here).
* No Alembic migrations (tables are created at start-up), no refresh tokens, no password reset, and only login lock-out for brute-force protection.
* Alerts are in-app only (no email/SMS). A scheduler exists (`ENABLE_SCHEDULER=true`) but is off by default; the check can be run on demand.
* Uploaded documents are stored on the local disk of the API server.
* Dashboards are computed in Python over the caller's scoped cases, which is fine for a prototype but would move to SQL aggregates at scale.
* The Docker files were written but not built in the authoring environment (no Docker daemon there); the manual route was run and tested.
