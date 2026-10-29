from tests.conftest import inst_by_name
from tests.test_workflow import reg


def test_known_category_routes_by_rule(client, login):
    h = login("supervisor")
    c = reg(client, h, category="Infrastructure")
    assert c["bureau"]["name"] == "Technical Bureau" and "PROTOTYPE" in c["routing_note"]
    assert c["officer"]["username"] in ("kulkarni", "patil")


def test_multi_subject_goes_to_manual_review(client, login):
    h = login("supervisor")
    c = reg(client, h, category="Fees", other_subjects=["Infrastructure"])
    assert c["bureau"]["name"] == "Manual Review Queue" and c["officer"] is None
    assert c["pending_action"] == "Manual routing review"
    q = client.get("/complaints/review-queue", headers=h).json()
    assert c["case_id"] in [x["case_id"] for x in q]


def test_category_without_rule_goes_to_manual_review(client, login):
    c = reg(client, login("supervisor"), category="Other")
    assert c["bureau"]["is_review_queue"] is True and "No routing rule" in c["routing_note"]


def test_conflicting_rules_go_to_manual_review(client, login):
    adm, sup = login("admin"), login("supervisor")
    bureaus = {b["name"]: b["id"] for b in client.get("/bureaus", headers=sup).json()}
    assert client.post("/routing-rules", json={"category": "Fees", "bureau_id": bureaus["Technical Bureau"]}, headers=adm).status_code == 201
    c = reg(client, sup, category="Fees")
    assert c["bureau"]["is_review_queue"] and "Conflicting" in c["routing_note"]


def test_jurisdiction_rule_applies_only_to_its_state(client, login):
    adm, sup = login("admin"), login("supervisor")
    bureaus = {b["name"]: b["id"] for b in client.get("/bureaus", headers=sup).json()}
    client.post("/routing-rules", json={"category": "Infrastructure", "state": "Kerala", "bureau_id": bureaus["Approval Bureau"]}, headers=adm)
    kerala = inst_by_name(client, sup, "Malabar")
    other = inst_by_name(client, sup, "Sahyadri")
    a = reg(client, sup, kerala["code"], "Infrastructure", "Roof damage", "The roof of the main block is damaged and unsafe.")
    b = reg(client, sup, other["code"], "Infrastructure", "Roof damage", "The roof of the main block is damaged and unsafe.")
    assert a["bureau"]["name"] == "Approval Bureau" and b["bureau"]["name"] == "Technical Bureau"


def test_inactive_rule_not_used(client, login):
    adm, sup = login("admin"), login("supervisor")
    rule = next(r for r in client.get("/routing-rules", headers=sup).json() if r["category"] == "Admissions")
    body = {"category": "Admissions", "bureau_id": rule["bureau"]["id"], "active": False}
    assert client.put(f"/routing-rules/{rule['id']}", json=body, headers=adm).status_code == 200
    assert reg(client, sup, category="Admissions")["bureau"]["is_review_queue"]


def test_manual_review_assignment_moves_case_out_of_queue(client, login):
    sup = login("supervisor")
    c = reg(client, sup, category="Other")
    appr = next(b for b in client.get("/bureaus", headers=sup).json() if b["name"] == "Approval Bureau")
    r = client.post(f"/complaints/{c['case_id']}/assign", json={"bureau_id": appr["id"], "reason": "Reviewed: approvals matter"}, headers=sup).json()
    assert r["bureau"]["name"] == "Approval Bureau" and r["officer"]["username"] == "deshmukh"
    assert c["case_id"] not in [x["case_id"] for x in client.get("/complaints/review-queue", headers=sup).json()]


# ---------------- overlaps ----------------
LAB_A = ("Infrastructure", "Computer lab machines outdated", "Computer lab machines are outdated and many are not working for students.")
LAB_B = ("Academic Quality", "Practical sessions suffer", "Workshop equipment is broken so students cannot do their practicals.")


def test_related_cross_bureau_complaint_is_flagged_with_explanation(client, login):
    sup = login("supervisor")
    a = reg(client, sup, "INS-0006", *LAB_A)
    b = reg(client, sup, "INS-0006", *LAB_B)
    assert a["bureau"]["name"] != b["bureau"]["name"]
    links = client.get(f"/complaints/{b['case_id']}/overlaps", headers=sup).json()
    hit = [l for l in links if a["case_id"] in (l["case_a"]["case_id"], l["case_b"]["case_id"])]
    assert hit and hit[0]["status"] == "suggested" and hit[0]["score"] >= 0.3
    kinds = {s["type"] for s in hit[0]["signals"]}
    assert {"institution", "category", "text", "timing", "bureau"} <= kinds
    assert all(s["label"] and s["detail"] for s in hit[0]["signals"])


def test_same_institution_unrelated_issue_is_not_flagged(client, login):
    sup = login("supervisor")
    lab = reg(client, sup, "INS-0006", *LAB_A)
    fee = reg(client, sup, "INS-0006", "Fees", "Tuition overcharged", "Management is charging tuition above the approved structure.")
    links = client.get(f"/complaints/{fee['case_id']}/overlaps", headers=sup).json()
    assert not any(lab["case_id"] in (l["case_a"]["case_id"], l["case_b"]["case_id"]) for l in links)


def test_different_institutions_never_overlap(client, login):
    sup = login("supervisor")
    a = reg(client, sup, "INS-0006", *LAB_A)
    b = reg(client, sup, "INS-0007", *LAB_A)
    assert client.get(f"/complaints/{b['case_id']}/overlaps", headers=sup).json() == []


def _pair(client, sup):
    a = reg(client, sup, "INS-0006", *LAB_A)
    b = reg(client, sup, "INS-0006", *LAB_B)
    link = client.get(f"/complaints/{b['case_id']}/overlaps", headers=sup).json()[0]
    return a, b, link


def test_link_requires_reason_and_keeps_both_records(client, login):
    sup = login("supervisor")
    a, b, link = _pair(client, sup)
    assert client.post(f"/overlaps/{link['id']}/decision", json={"decision": "link", "reason": ""}, headers=sup).status_code == 422
    r = client.post(f"/overlaps/{link['id']}/decision", json={"decision": "link", "reason": "Both about broken lab equipment"}, headers=sup)
    assert r.status_code == 200 and r.json()["status"] == "linked" and r.json()["decision_reason"].startswith("Both")
    for c in (a, b):  # nothing merged, closed or status-changed
        now = client.get(f"/complaints/{c['case_id']}", headers=sup).json()
        assert now["status"] == c["status"] and now["bureau"]["id"] == c["bureau"]["id"]
        hist = client.get(f"/complaints/{c['case_id']}/history", headers=sup).json()
        assert any(x["event_type"] == "link" and "linked" in x["description"] for x in hist)
    assert client.post(f"/overlaps/{link['id']}/decision", json={"decision": "dismiss", "reason": "changed my mind"}, headers=sup).status_code == 409
    un = client.post(f"/overlaps/{link['id']}/decision", json={"decision": "unlink", "reason": "Linked by mistake"}, headers=sup)
    assert un.json()["status"] == "unlinked"


def test_dismiss_records_reason_and_does_not_resurface(client, login):
    sup = login("supervisor")
    a, b, link = _pair(client, sup)
    r = client.post(f"/overlaps/{link['id']}/decision", json={"decision": "dismiss", "reason": "Different campuses"}, headers=sup)
    assert r.json()["status"] == "dismissed"
    client.post("/overlaps/scan", headers=sup)
    again = [l for l in client.get("/overlaps", params={"status": "suggested"}, headers=sup).json() if l["id"] == link["id"]]
    assert again == []
    assert client.get("/overlaps", params={"status": "dismissed"}, headers=sup).json()[0]["decision_reason"] == "Different campuses"
    log = client.get("/audit", params={"action": "overlap"}, headers=sup).json()
    assert any(e["action"] == "overlap.dismiss" and "Different campuses" in e["detail"] for e in log)


def test_officer_sees_other_bureau_case_redacted_and_can_decide(client, login):
    sup = login("supervisor")
    a, b, link = _pair(client, sup)  # Technical vs Approval
    tech = login("kulkarni")
    seen = [l for l in client.get("/overlaps", headers=tech).json() if l["id"] == link["id"]][0]
    sides = [seen["case_a"], seen["case_b"]]
    red = [s for s in sides if s["redacted"]][0]
    full = [s for s in sides if not s["redacted"]][0]
    assert red["bureau"] == "Approval Bureau" and red["description"] == "" and "restricted" in red["subject"]
    assert full["bureau"] == "Technical Bureau" and full["description"]
    assert client.post(f"/overlaps/{link['id']}/decision", json={"decision": "link", "reason": "Same lab equipment issue"}, headers=tech).status_code == 200


def test_officer_cannot_decide_on_pair_outside_scope(client, login):
    sup = login("supervisor")
    a, b, link = _pair(client, sup)
    sgc = login("iyer")  # grievance cell: sees neither case
    assert client.post(f"/overlaps/{link['id']}/decision", json={"decision": "link", "reason": "Trying anyway"}, headers=sgc).status_code == 404
    assert client.post(f"/overlaps/{link['id']}/decision", json={"decision": "link", "reason": "Management cannot"}, headers=login("management")).status_code == 403


def test_manual_link(client, login):
    sup = login("supervisor")
    a = reg(client, sup, "INS-0006", "Fees", "A subject", "Some description about fees collected.")
    b = reg(client, sup, "INS-0007", "Fees", "B subject", "Another description of different issue.")
    r = client.post("/overlaps/manual", json={"case_a": a["case_id"], "case_b": b["case_id"], "reason": "Same management group"}, headers=sup)
    assert r.status_code == 201 and r.json()["status"] == "linked" and r.json()["origin"] == "manual"
    assert client.post("/overlaps/manual", json={"case_a": a["case_id"], "case_b": b["case_id"], "reason": "Same management group"}, headers=sup).status_code == 409
