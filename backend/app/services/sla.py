"""Ageing / overdue maths. Pending (due soon) and overdue are deliberately different states."""
from datetime import date, timedelta

from . import config_svc


def due_date_for(db, registered: date, priority: str) -> date:
    days = config_svc.get(db, "sla_days")
    return registered + timedelta(days=int(days.get(priority, days["Medium"])))


def sla_state(db, complaint, today: date) -> dict:
    """Returns {state, days_left, age_days}. state: closed|on_track|due_soon|overdue|escalated."""
    age = (today - complaint.registered_on).days
    if complaint.status in config_svc.CLOSED_STATUSES:
        return {"state": "closed", "days_left": None, "age_days": age}
    left = (complaint.due_date - today).days
    warn = int(config_svc.get(db, "warn_days"))
    esc = int(config_svc.get(db, "escalation_days"))
    if left < 0:
        state = "escalated" if -left >= esc else "overdue"
    elif left <= warn:
        state = "due_soon"
    else:
        state = "on_track"
    return {"state": state, "days_left": left, "age_days": age}


def age_bucket(age: int) -> str:
    return "0-7 days" if age <= 7 else "8-14 days" if age <= 14 else "15-30 days" if age <= 30 else "30+ days"
