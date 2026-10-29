import re

from tests.conftest import inst_by_name


def reg(client, h, inst_code="INS-0001", category="Fees", subject="Test complaint", description="This is a sufficiently long description.", **kw):
    r = client.post("/complaints", json={"institution_code": inst_code, "category": category, "subject": subject, "description": description, **kw}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def test_case_ids_unique_sequential_and_institution_consistent(client, login):
    h = login("supervisor")
    before = client.get("/complaints", params={"size": 200}, headers=h).json()["total"]
    a, b = reg(client, h, "INS-0001"), reg(client, h, "INS-0002", "Faculty")
    assert re.fullmatch(r"CMP-2026-\d{6}", a["case_id"]) and a["case_id"] != b["case_id"]
    assert int(b["case_id"][-6:]) == int(a["case_id"][-6:]) + 1
    assert a["institution"]["code"] == "INS-0001" and b["institution"]["code"] == "INS-0002"
    again = client.get(f"/complaints/{a['case_id']}", headers=h).json()
    assert again["institution"]["id"] == a["institution"]["id"]
    assert client.get("/complaints", params={"size": 200}, headers=h).json()["total"] == before + 2
    # institution consolidated view contains the case
    inst = a["institution"]["id"]
    ids = [c["case_id"] for c in client.get(f"/institutions/{inst}/cases", headers=h).json()["items"]]
    assert a["case_id"] in ids


def test_unknown_institution_or_category_rejected(client, login):
    h = login("supervisor")
    bad = {"institution_code": "INS-9999", "category": "Fees", "subject": "x y z", "description": "long enough description"}
    assert client.post("/complaints", json=bad, headers=h).status_code == 422
    bad2 = {**bad, "institution_code": "INS-0001", "category": "Nonsense"}
    assert client.post("/complaints", json=bad2, headers=h).status_code == 422
    short = {**bad, "institution_code": "INS-0001", "description": "short"}
    assert client.post("/complaints", json=short, headers=h).status_code == 422  # Pydantic validation


def test_status_transitions_preserve_history(client, login):
    h = login("supervisor")
    c = reg(client, h, "INS-0001", "Infrastructure")
    cid = c["case_id"]
    hist0 = client.get(f"/complaints/{cid}/history", headers=h).json()
    assert client.post(f"/complaints/{cid}/status", json={"to_status": "Resolved", "note": "skip ahead"}, headers=h).status_code == 409  # Open -> Resolved not allowed
    r = client.post(f"/complaints/{cid}/status", json={"to_status": "In Progress"}, headers=h)
    assert r.status_code == 200 and r.json()["status"] == "In Progress"
    assert client.post(f"/complaints/{cid}/status", json={"to_status": "Resolved", "note": "x"}, headers=h).status_code == 422  # note required
    assert client.post(f"/complaints/{cid}/status", json={"to_status": "Resolved", "note": "Fixed and verified on site"}, headers=h).status_code == 200
    hist = client.get(f"/complaints/{cid}/history", headers=h).json()
    assert len(hist) == len(hist0) + 2
    assert hist[: len(hist0)] == hist0  # earlier entries untouched
    st = [x for x in hist if x["event_type"] == "status"]
    assert [(x["old_value"], x["new_value"]) for x in st] == [("Open", "In Progress"), ("In Progress", "Resolved")]
    assert all(x["actor_name"] == "Suresh Sharma" and x["created_at"] for x in st)
    # officers cannot reopen; supervisor can
    assert client.post(f"/complaints/{cid}/status", json={"to_status": "In Progress", "note": "reopening for review"}, headers=login("kulkarni")).status_code in (403, 404)
    assert client.post(f"/complaints/{cid}/status", json={"to_status": "In Progress", "note": "reopening for review"}, headers=h).status_code == 200


def test_editing_records_old_and_new_values_and_recalculates_due(client, login):
    h = login("supervisor")
    c = reg(client, h, priority="Low")
    r = client.patch(f"/complaints/{c['case_id']}", json={"priority": "High", "subject": "Changed subject"}, headers=h).json()
    assert r["priority"] == "High" and r["due_date"] != c["due_date"]
    hist = client.get(f"/complaints/{c['case_id']}/history", headers=h).json()
    edits = [x for x in hist if x["event_type"] == "edit"]
    assert any(e["old_value"] == "Low" and e["new_value"] == "High" for e in edits)
    assert any(e["old_value"] == "Test complaint" for e in edits)


def test_assignment_change_keeps_assignment_history(client, login):
    h = login("supervisor")
    c = reg(client, h, category="Infrastructure")
    assert c["bureau"]["name"] == "Technical Bureau"
    bureaus = {b["name"]: b for b in client.get("/bureaus", headers=h).json()}
    appr = bureaus["Approval Bureau"]
    assert client.post(f"/complaints/{c['case_id']}/assign", json={"bureau_id": appr["id"], "reason": "x"}, headers=h).status_code == 422  # reason too short
    r = client.post(f"/complaints/{c['case_id']}/assign", json={"bureau_id": appr["id"], "reason": "Falls under approvals"}, headers=h)
    assert r.status_code == 200 and r.json()["bureau"]["name"] == "Approval Bureau"
    asg = client.get(f"/complaints/{c['case_id']}/assignments", headers=h).json()
    assert [a["bureau"]["name"] for a in asg] == ["Technical Bureau", "Approval Bureau"]
    assert asg[0]["released_on"] is not None and asg[1]["released_on"] is None
    hist = client.get(f"/complaints/{c['case_id']}/history", headers=h).json()
    assert any(x["event_type"] == "assignment" and "Falls under approvals" in x["description"] for x in hist)
    # the previous bureau's officer loses access once the case moves
    assert client.get(f"/complaints/{c['case_id']}", headers=login("kulkarni")).status_code == 404
    assert client.get(f"/complaints/{c['case_id']}", headers=login("deshmukh")).status_code == 200
    # officer must belong to the target bureau
    kul = next(u for u in client.get("/users", headers=h).json() if u["username"] == "kulkarni")
    assert client.post(f"/complaints/{c['case_id']}/assign", json={"bureau_id": appr["id"], "officer_id": kul["id"], "reason": "wrong officer"}, headers=h).status_code == 422


def test_notes_and_documents(client, login):
    h = login("supervisor")
    c = reg(client, h)
    assert client.post(f"/complaints/{c['case_id']}/notes", json={"note": "Called the institute"}, headers=h).status_code == 201
    ok = client.post(f"/complaints/{c['case_id']}/documents", files={"file": ("evidence.pdf", b"%PDF-1.4 test", "application/pdf")}, headers=h)
    assert ok.status_code == 201 and ok.json()["filename"] == "evidence.pdf"
    assert client.post(f"/complaints/{c['case_id']}/documents", files={"file": ("virus.exe", b"MZ", "application/octet-stream")}, headers=h).status_code == 415
    dl = client.get(f"/complaints/{c['case_id']}/documents/{ok.json()['id']}/download", headers=h)
    assert dl.status_code == 200 and dl.content.startswith(b"%PDF")
    assert client.get(f"/complaints/{c['case_id']}", headers=h).json()["document_count"] == 1
    # another bureau cannot download it
    assert client.get(f"/complaints/{c['case_id']}/documents/{ok.json()['id']}/download", headers=login("kulkarni")).status_code == 404


def test_search_filter_sort(client, login):
    h = login("supervisor")
    r = client.get("/complaints", params={"q": "hostel"}, headers=h).json()
    assert r["total"] >= 1 and all("hostel" in (c["subject"] + c["description"]).lower() for c in r["items"])
    r = client.get("/complaints", params={"category": "Fees", "status": "Open", "sort": "due_date", "order": "asc"}, headers=h).json()
    dues = [c["due_date"] for c in r["items"]]
    assert dues == sorted(dues) and all(c["category"] == "Fees" and c["status"] == "Open" for c in r["items"])
    r = client.get("/complaints", params={"overdue": True}, headers=h).json()
    assert r["total"] > 0 and all(c["sla"]["state"] in ("overdue", "escalated") for c in r["items"])
    r = client.get("/complaints", params={"date_from": "2026-10-01", "date_to": "2026-10-23"}, headers=h).json()
    assert all("2026-10-01" <= c["registered_on"] <= "2026-10-23" for c in r["items"])


def test_institution_duplicate_detection(client, login):
    h = login("supervisor")
    body = {"name": "Sahyadri Inst. of Tech", "state": "Maharashtra", "city": "Pune"}
    r = client.post("/institutions", json=body, headers=h)
    assert r.status_code == 409 and r.json()["detail"]["matches"][0]["code"] == "INS-0001"
    assert client.post("/institutions", json={**body, "confirm_distinct": True}, headers=h).status_code == 201
    new = client.post("/institutions", json={"name": "Himalayan Academy of Applied Sciences"}, headers=h)
    assert new.status_code == 201 and new.json()["code"].startswith("INS-")
    m = client.get("/institutions/resolve", params={"name": "SIT Pune"}, headers=h).json()
    assert m and m[0]["institution"]["code"] == "INS-0001"
    assert client.post("/institutions", json=body, headers=login("kulkarni")).status_code == 403
