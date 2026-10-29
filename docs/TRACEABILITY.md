# Requirement traceability (problem statement PS 26264)

| Deliverable | Where it is implemented | Where it is tested |
|---|---|---|
| A. Auth, role-based access, institution master, register, institution-wise view | `app/deps.py`, `routers/auth.py`, `routers/institutions.py`; UI Login, Institutions, InstitutionProfile | `test_security.py`, `test_workflow.py` |
| B. Searchable dashboard and filters | `GET /complaints` (`routers/complaints.py`); UI Cases | `test_search_filter_sort` |
| C. Workflow: register, case ID, reassign, transitions, notes, history, indicators, audit | `routers/complaints.py`, `services/audit.py`, `services/sla.py` | `test_workflow.py` |
| D. Potential-overlap detection | `services/overlap.py`, `routers/overlaps.py`; UI Related cases | `test_routing_overlap.py`, `test_overlap_accuracy.py`, `docs/OVERLAP_EVALUATION.md` |
| E. Configurable routing + manual review | `services/routing.py`, `RoutingRule`, `routers/admin.py`; UI Routing | `test_routing_overlap.py` |
| F. Alerts and monitoring | `services/alerts.py`, `Notification.dedupe_key`; UI Alerts | `test_sla_alerts_reports.py` |
| G. FastAPI REST APIs, Pydantic validation | `app/routers/*`, `app/schemas.py` (OpenAPI at `/docs`) | all tests; `postman/` collection |
| H. PostgreSQL + SQLAlchemy data model | `app/models.py` (all 11 entities from the statement plus settings/counters/documents) | tests run on SQLite and PostgreSQL |
| I. Testing | `backend/tests` (43 tests) | see below |
| J. Live demonstration | `docs/DEMO_SCRIPT.md`, `docs/VIDEO_DEMO_SCRIPT.md` | rehearsed in a real browser during build |
| K. Seeded data + backup | `app/seed.py`, `scripts/backup.py`, `demo_backup/` | seed runs inside every test |
| L. Citizen Mobile App, OTP Auth, Geotagging & Tracking | `mobile/` (Expo SDK 58), `routers/citizen.py`, `services/resend_svc.py`, `docs/MOBILE_APP.md` | Manual & end-to-end device testing |
| M. Regional Filtering & Analytics | `routers/complaints.py`, `routers/reports.py`, UI Cases & Reports | Verified in UI & API tests |

## Section I checklist
| Required check | Test |
|---|---|
| Unauthorised users cannot access restricted cases or operations | `test_security.py` (7 tests) |
| Case IDs and institution references consistent | `test_case_ids_unique_sequential_and_institution_consistent` |
| Status and assignment changes preserve history | `test_status_transitions_preserve_history`, `test_assignment_change_keeps_assignment_history` |
| Ambiguous routing enters review workflow | `test_multi_subject_...`, `test_category_without_rule_...`, `test_conflicting_rules_...` |
| Overlap suggestions can be reviewed, dismissed or linked | `test_link_requires_reason...`, `test_dismiss_records_reason...` |
| Overdue calculations follow configured rules | `test_sla_states_follow_configured_thresholds`, `test_due_date_uses_priority_sla_and_config` |
| Reports respect user permissions | `test_reports_respect_user_scope`, `test_export_requires_permission...` |
