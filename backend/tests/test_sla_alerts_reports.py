from datetime import date, timedelta
from types import SimpleNamespace

from app.config import settings
from app.services import sla
from tests.test_workflow import reg


def fake(reg_on, due, status="Open"):
    return SimpleNamespace(registered_on=reg_on, due_date=due, status=status)


def test_sla_states_follow_configured_thresholds(client, login):
    with client.Session() as db:
        today = date(2026, 10, 23)
        st = lambda due, status="Open": sla.sla_state(db, fake(today - timedelta(days=10), due, status), today)["state"]
        assert st(today + timedelta(days=10)) == "on_track"
        assert st(today + timedelta(days=3)) == "due_soon"    # warn_days = 3 -> inclusive
        assert st(today + timedelta(days=4)) == "on_track"
        assert st(today) == "due_soon"                         # due today is pending, not overdue
        assert st(today - timedelta(days=1)) == "overdue"
        assert st(today - timedelta(days=6)) == "overdue"
        assert st(today - timedelta(days=7)) == "escalated"  # escalation_days = 7
        assert st(today - timedelta(days=30), "Resolved") == "closed"
    # thresholds are configurable
    assert client.put("/config", json={"warn_days": 5, "escalation_days": 3}, headers=login("admin")).status_code == 200
    with client.Session() as db:
        today = date(2026, 10, 23)
        assert sla.sla_state(db, fake(today, today + timedelta(days=5)), today)["state"] == "due_soon"
        assert sla.sla_state(db, fake(today, today - timedelta(days=3)), today)["state"] == "escalated"


def test_due_date_uses_priority_sla_and_config(client, login):
    sup, adm = login("supervisor"), login("admin")
    hi = reg(client, sup, priority="High")
    assert (date.fromisoformat(hi["due_date"]) - date.fromisoformat(hi["registered_on"])).days == 7
    client.put("/config", json={"sla_days": {"High": 2, "Medium": 10, "Low": 20}}, headers=adm)
    hi2 = reg(client, sup, priority="High")
    assert (date.fromisoformat(hi2["due_date"]) - date.fromisoformat(hi2["registered_on"])).days == 2
    assert client.put("/config", json={"sla_days": {"High": 2}}, headers=adm).status_code == 422


def test_pending_and_overdue_are_distinct_in_api(client, login):
    items = client.get("/complaints", params={"size": 200}, headers=login("supervisor")).json()["items"]
    states = {c["sla"]["state"] for c in items}
    assert {"due_soon", "overdue", "escalated", "closed", "on_track"} <= states
    for c in items:
        if c["sla"]["state"] == "due_soon":
            assert 0 <= c["sla"]["days_left"] <= 3
        if c["sla"]["state"] in ("overdue", "escalated"):
            assert c["sla"]["days_left"] < 0


def test_alert_checks_do_not_create_duplicates(client, login):
    sup = login("supervisor")
    n1 = client.get("/notifications", headers=sup).json()
    r1 = client.post("/alerts/run", headers=sup).json()
    assert r1["created"] == 0 and r1["suppressed_duplicates"] > 0  # seed already ran the check once
    r2 = client.post("/alerts/run", headers=sup).json()
    assert r2["created"] == 0
    assert len(client.get("/notifications", headers=sup).json()) == len(n1)
    # a brand-new overdue case generates exactly its alerts once
    adm = login("admin")
    client.put("/config", json={"sla_days": {"High": 1, "Medium": 1, "Low": 1}}, headers=adm)
    settings.fixed_today = "2026-10-23"
    c = reg(client, sup, priority="Low")
    settings.fixed_today = "2026-10-26"  # three days later: overdue but not escalated
    try:
        a = client.post("/alerts/run", headers=sup).json()
        b = client.post("/alerts/run", headers=sup).json()
    finally:
        settings.fixed_today = "2026-10-23"
    assert a["created"] >= 1 and b["created"] == 0
    kinds = [n["kind"] for n in client.get("/notifications", headers=sup).json() if n["case_id"] == c["case_id"]]
    assert kinds.count("overdue") == 1 and "escalated" not in kinds
    hist = client.get(f"/complaints/{c['case_id']}/history", headers=sup).json()
    assert sum(1 for x in hist if x["event_type"] == "alert") == 1
    assert client.post("/alerts/run", headers=login("iyer")).status_code == 403


def test_escalation_goes_to_supervisor_role(client, login):
    notes = client.get("/notifications", headers=login("supervisor")).json()
    esc = [n for n in notes if n["kind"] == "escalated"]
    assert esc and all(n["recipient_role"] == "supervisor" for n in esc)
    officer_notes = client.get("/notifications", headers=login("kulkarni")).json()
    assert officer_notes and not any(n["kind"] == "escalated" for n in officer_notes)


# ---------------- reports & dashboard ----------------
def test_reports_respect_user_scope(client, login):
    off = client.get("/reports/cases", headers=login("kulkarni")).json()
    allr = client.get("/reports/cases", headers=login("supervisor")).json()
    assert off["total"] < allr["total"] and {r["bureau"] for r in off["rows"]} == {"Technical Bureau"}
    # trying to filter into another bureau yields nothing, not data
    sgc = next(b for b in client.get("/bureaus", headers=login("supervisor")).json() if b["code"] == "SGC")
    assert client.get("/reports/cases", params={"bureau_id": sgc["id"]}, headers=login("kulkarni")).json()["total"] == 0


def test_export_requires_permission_and_is_scoped_and_audited(client, login):
    assert client.get("/reports/export", headers=login("kulkarni")).status_code == 403
    r = client.get("/reports/export", params={"category": "Fees"}, headers=login("management"))
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    lines = r.text.strip().splitlines()
    assert lines[0].startswith("case_id,") and len(lines) > 2 and all("Fees" in l for l in lines[1:])
    log = client.get("/audit", params={"action": "report.export"}, headers=login("admin")).json()
    assert log and ("cat=Fees" in log[0]["detail"] or "Category = Fees" in log[0]["detail"])
    j = client.get("/reports/export", params={"fmt": "json", "date_from": "2026-10-01"}, headers=login("supervisor"))
    assert all(x["registered_on"] >= "2026-10-01" for x in j.json())


def test_report_filters(client, login):
    sup = login("supervisor")
    inst = client.get("/institutions", params={"q": "Deccan"}, headers=sup).json()["items"][0]
    r = client.get("/reports/cases", params={"institution_id": inst["id"], "status": "Open"}, headers=sup).json()
    assert r["total"] > 0 and all(x["institution_code"] == inst["code"] and x["status"] == "Open" for x in r["rows"])


def test_csv_formula_injection_is_neutralised(client, login):
    sup = login("supervisor")
    reg(client, sup, subject="=HYPERLINK(\"http://evil\")", description="Subject begins with an equals sign here.")
    text = client.get("/reports/export", headers=sup).text
    assert "\"=HYPERLINK" not in text and "'=HYPERLINK" in text.replace('""', '"')


def test_dashboard_is_scoped_and_consistent(client, login):
    sup = client.get("/dashboard/summary", headers=login("supervisor")).json()
    t = sup["totals"]
    assert t["registered"] == t["pending"] + t["resolved"]
    assert sum(b["total"] for b in sup["by_bureau"]) == t["registered"]
    assert sum(x["value"] for x in sup["by_status"]) == t["registered"]
    off = client.get("/dashboard/summary", headers=login("kulkarni")).json()
    assert off["totals"]["registered"] < t["registered"] and [b["bureau"] for b in off["by_bureau"]] == ["Technical Bureau"]
    assert client.get("/dashboard/summary").status_code == 401


def test_institution_view_hides_other_bureaus_but_counts_them(client, login):
    inst = client.get("/institutions", params={"q": "Sahyadri"}, headers=login("supervisor")).json()["items"][0]
    full = client.get(f"/institutions/{inst['id']}/cases", headers=login("supervisor")).json()
    part = client.get(f"/institutions/{inst['id']}/cases", headers=login("kulkarni")).json()
    assert len(part["items"]) < len(full["items"]) and part["outside_scope_count"] == len(full["items"]) - len(part["items"])
    assert len(full["by_bureau"]) >= 2  # consolidated across at least two bureaus/cells
