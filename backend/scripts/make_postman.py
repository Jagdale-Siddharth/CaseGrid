"""Generate the Postman collection:  python -m scripts.make_postman"""
import json
from pathlib import Path

def req(name, method, path, body=None, form=None, query=None, auth=True, test=None, files=None):
    r = {"name": name, "request": {"method": method, "header": [], "url": {"raw": "{{baseUrl}}" + path, "host": ["{{baseUrl}}"], "path": [p for p in path.lstrip("/").split("/") if p]}}}
    if auth:
        r["request"]["auth"] = {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]}
    else:
        r["request"]["auth"] = {"type": "noauth"}
    if query:
        r["request"]["url"]["query"] = [{"key": k, "value": v} for k, v in query.items()]
    if body is not None:
        r["request"]["header"].append({"key": "Content-Type", "value": "application/json"})
        r["request"]["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2)}
    if form is not None:
        r["request"]["body"] = {"mode": "urlencoded", "urlencoded": [{"key": k, "value": v} for k, v in form.items()]}
    if files:
        r["request"]["body"] = {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": []}]}
    if test:
        r["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": test}}]
    return r

def login(name, user):
    return req(name, "POST", "/auth/login", form={"username": user, "password": "Demo@1234"}, auth=False,
               test=["pm.test('200', () => pm.response.to.have.status(200));", "pm.collectionVariables.set('token', pm.response.json().access_token);"])

REG = {"institution_code": "INS-0001", "category": "Infrastructure", "subject": "Practical equipment not working", "description": "Workshop equipment is broken so practical sessions cannot run for students.", "priority": "Medium", "source": "Portal", "other_subjects": []}
ok = ["pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));"]
denied = ["pm.test('forbidden or not found', () => pm.expect([403, 404]).to.include(pm.response.code));"]
folders = {
 "1 Authentication": [login("Login as supervisor", "supervisor"), login("Login as admin", "admin"), login("Login as Technical Bureau officer", "kulkarni"), login("Login as management (read-only)", "management"),
                      req("Current user", "GET", "/auth/me", test=ok), req("No token is rejected (401)", "GET", "/complaints", auth=False, test=["pm.test('401', () => pm.response.to.have.status(401));"])],
 "2 Institutions": [req("List / search", "GET", "/institutions", query={"q": "Sahyadri"}, test=ok), req("Resolve by name (candidates only)", "GET", "/institutions/resolve", query={"name": "SIT Pune"}, test=ok),
                    req("Create (409 if possible duplicate)", "POST", "/institutions", body={"name": "Himalayan Academy of Applied Sciences", "state": "Uttarakhand", "city": "Dehradun"}),
                    req("Profile", "GET", "/institutions/1", test=ok), req("Consolidated cases across bureaus", "GET", "/institutions/1/cases", test=ok)],
 "3 Complaints": [req("Register complaint (routing + overlap scan)", "POST", "/complaints", body=REG),
                  req("Register multi-subject complaint (goes to manual review)", "POST", "/complaints", body={**REG, "other_subjects": ["Fees"]}),
                  req("List with filters and sorting", "GET", "/complaints", query={"status": "Open", "category": "Fees", "sort": "due_date", "order": "asc", "overdue": "false"}, test=ok),
                  req("Get case", "GET", "/complaints/CMP-2026-000001", test=ok), req("Update fields (logged with old/new)", "PATCH", "/complaints/CMP-2026-000001", body={"pending_action": "Awaiting inspection report"}),
                  req("Change status", "POST", "/complaints/CMP-2026-000002/status", body={"to_status": "In Progress", "note": "Taking up the case"}),
                  req("Reassign (supervisor/admin)", "POST", "/complaints/CMP-2026-000002/assign", body={"bureau_id": 2, "reason": "Falls under approvals"}),
                  req("Add note", "POST", "/complaints/CMP-2026-000002/notes", body={"note": "Called the institute registrar"}),
                  req("Case history", "GET", "/complaints/CMP-2026-000001/history", test=ok), req("Assignment history", "GET", "/complaints/CMP-2026-000001/assignments", test=ok),
                  req("Upload document", "POST", "/complaints/CMP-2026-000001/documents", files=True), req("List documents", "GET", "/complaints/CMP-2026-000001/documents", test=ok),
                  req("Manual review queue", "GET", "/complaints/review-queue", test=ok),
                  req("Out-of-scope case as officer (expect 404)", "GET", "/complaints/CMP-2026-000002", test=denied)],
 "4 Potential overlaps": [req("List suggestions", "GET", "/overlaps", query={"status": "suggested"}, test=ok), req("Overlaps for one case", "GET", "/complaints/CMP-2026-000004/overlaps", test=ok),
                          req("Link (reason required)", "POST", "/overlaps/1/decision", body={"decision": "link", "reason": "Both describe broken lab equipment"}),
                          req("Dismiss (reason required)", "POST", "/overlaps/2/decision", body={"decision": "dismiss", "reason": "Different campuses"}),
                          req("Unlink", "POST", "/overlaps/1/decision", body={"decision": "unlink", "reason": "Linked by mistake"}),
                          req("Manual link", "POST", "/overlaps/manual", body={"case_a": "CMP-2026-000001", "case_b": "CMP-2026-000004", "reason": "Same management group"}),
                          req("Scan all cases", "POST", "/overlaps/scan")],
 "5 Routing, config and alerts": [req("List routing rules", "GET", "/routing-rules", test=ok), req("Create rule (admin)", "POST", "/routing-rules", body={"category": "Fees", "state": "Kerala", "bureau_id": 3}),
                                  req("Update rule (admin)", "PUT", "/routing-rules/1", body={"category": "Infrastructure", "bureau_id": 1, "is_verified": False, "active": True}),
                                  req("Get config", "GET", "/config", test=ok), req("Update thresholds (admin)", "PUT", "/config", body={"warn_days": 3, "escalation_days": 7}),
                                  req("Run alert check (no duplicates)", "POST", "/alerts/run", test=ok), req("My notifications", "GET", "/notifications", test=ok), req("Mark read", "POST", "/notifications/1/read")],
 "6 Dashboard and reports": [req("Dashboard summary", "GET", "/dashboard/summary", test=ok), req("Report preview", "GET", "/reports/cases", query={"status": "Open", "date_from": "2026-10-01"}, test=ok),
                             req("Export CSV (needs report:export)", "GET", "/reports/export", query={"fmt": "csv", "category": "Fees"}), req("Export JSON", "GET", "/reports/export", query={"fmt": "json"})],
 "7 Administration": [req("Audit trail (supervisor/admin)", "GET", "/audit", query={"limit": "50"}), req("Users", "GET", "/users"), req("Backup export (admin)", "GET", "/admin/export"), req("Meta", "GET", "/meta", test=ok), req("Bureaus", "GET", "/bureaus", test=ok)],
}
col = {"info": {"name": "AICTE Complaint Monitor API", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
                "description": "Run 'Login as ...' first; the token is stored automatically. Seeded demo password: Demo@1234"},
       "variable": [{"key": "baseUrl", "value": "http://localhost:8000"}, {"key": "token", "value": ""}],
       "item": [{"name": n, "item": items} for n, items in folders.items()]}
out = Path(__file__).resolve().parents[2] / "postman" / "AICTE_Complaint_Monitor.postman_collection.json"
out.write_text(json.dumps(col, indent=2))
print("wrote", out, sum(len(v) for v in folders.values()), "requests")
