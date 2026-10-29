from app.seed import DEMO_PASSWORD
from tests.conftest import inst_by_name


def test_requests_without_token_are_rejected(client):
    for path in ["/complaints", "/institutions", "/dashboard/summary", "/reports/cases", "/audit", "/notifications"]:
        assert client.get(path).status_code == 401, path


def test_tampered_token_rejected(client, login):
    tok = login("admin")["Authorization"].split()[1]
    bad = {"Authorization": f"Bearer {tok[:-3]}abc"}
    assert client.get("/auth/me", headers=bad).status_code == 401


def test_login_failure_is_audited_and_account_locks(client, login):
    for _ in range(5):
        assert client.post("/auth/login", data={"username": "iyer", "password": "wrong"}).status_code == 401
    r = client.post("/auth/login", data={"username": "iyer", "password": DEMO_PASSWORD})
    assert r.status_code == 429  # locked even with the right password
    log = client.get("/audit", params={"action": "login"}, headers=login("admin")).json()
    assert sum(1 for e in log if e["action"] == "login.failure" and not e["success"]) >= 5


def test_officer_only_sees_own_bureau_cases(client, login):
    h = login("kulkarni")  # Technical Bureau
    items = client.get("/complaints", params={"size": 200}, headers=h).json()["items"]
    assert items and {c["bureau"]["name"] for c in items} == {"Technical Bureau"}
    sup = client.get("/complaints", params={"size": 200}, headers=login("supervisor")).json()
    assert sup["total"] > len(items)


def test_officer_cannot_open_case_of_another_bureau(client, login):
    sup = client.get("/complaints", params={"q": "Excess tuition"}, headers=login("supervisor")).json()["items"][0]
    assert sup["bureau"]["name"] == "Student Grievance Cell"
    h = login("kulkarni")
    for url in (f"/complaints/{sup['case_id']}", f"/complaints/{sup['case_id']}/history", f"/complaints/{sup['case_id']}/overlaps"):
        assert client.get(url, headers=h).status_code == 404  # not 403: existence is not leaked
    assert client.post(f"/complaints/{sup['case_id']}/status", json={"to_status": "In Progress"}, headers=h).status_code == 404
    denied = client.get("/audit", params={"action": "access.denied"}, headers=login("admin")).json()
    assert any(e["entity_id"] == sup["case_id"] and not e["success"] for e in denied)


def test_role_permissions_enforced_on_backend(client, login):
    case = client.get("/complaints", params={"size": 1}, headers=login("supervisor")).json()["items"][0]
    off, mgmt = login("deshmukh"), login("management")
    body = {"bureau_id": 1, "reason": "trying to reassign"}
    assert client.post(f"/complaints/{case['case_id']}/assign", json=body, headers=off).status_code == 403
    assert client.get("/audit", headers=off).status_code == 403
    assert client.put("/config", json={"warn_days": 5}, headers=off).status_code == 403
    assert client.post("/users", json={"username": "x1", "full_name": "X Y", "password": "Password1!", "role_id": 1}, headers=off).status_code == 403
    # management is read-only
    payload = {"institution_code": "INS-0001", "category": "Fees", "subject": "Test", "description": "A long enough description."}
    assert client.post("/complaints", json=payload, headers=mgmt).status_code == 403
    assert client.post(f"/complaints/{case['case_id']}/notes", json={"note": "hello there"}, headers=mgmt).status_code == 403
    assert client.post("/overlaps/scan", headers=mgmt).status_code == 403


def test_only_admin_can_edit_routing_rules(client, login):
    rules = client.get("/routing-rules", headers=login("supervisor")).json()
    body = {"category": "Fees", "bureau_id": rules[0]["bureau"]["id"]}
    assert client.post("/routing-rules", json=body, headers=login("supervisor")).status_code == 403
    assert client.post("/routing-rules", json=body, headers=login("admin")).status_code == 201


def test_password_is_hashed(client):
    from app.models import User
    with client.Session() as s:
        u = s.query(User).filter_by(username="admin").one()
        assert u.password_hash.startswith("$2") and DEMO_PASSWORD not in u.password_hash
