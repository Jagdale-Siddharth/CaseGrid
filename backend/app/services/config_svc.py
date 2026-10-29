"""Business-rule configuration stored in the settings table (editable by admins)."""
from sqlalchemy.orm import Session

from ..models import Setting

DEFAULTS = {
    "sla_days": {"High": 7, "Medium": 15, "Low": 30},
    "warn_days": 3,             # reminder when due within N days
    "escalation_days": 7,       # escalate when overdue by N days
    "overlap_threshold": 0.30,  # minimum score; chosen on a dev split, validated on held-out pairs (see docs)
    "overlap_window_days": 60,  # complaints further apart than this get no timing signal
    "categories": ["Infrastructure", "Faculty", "Fees", "Admissions", "Affiliation", "Academic Quality", "Other"],
    "related_categories": {
        "Fees": ["Admissions"], "Admissions": ["Fees"],
        "Faculty": ["Affiliation", "Academic Quality"], "Affiliation": ["Faculty", "Academic Quality"],
        "Academic Quality": ["Faculty", "Affiliation", "Infrastructure"], "Infrastructure": ["Academic Quality"],
    },
}

# Permitted status transitions -> required permission to perform them
TRANSITIONS = {
    "Open": {"In Progress": "case:status", "Under Review": "case:status"},
    "In Progress": {"Pending Information": "case:status", "Under Review": "case:status", "Resolved": "case:status"},
    "Pending Information": {"In Progress": "case:status"},
    "Under Review": {"In Progress": "case:status", "Resolved": "case:status"},
    "Resolved": {"In Progress": "case:reopen"},
}
CLOSED_STATUSES = {"Resolved"}
NOTE_REQUIRED = {"Resolved", "Pending Information"}


def get(db: Session, key: str):
    row = db.get(Setting, key)
    return row.value if row else DEFAULTS[key]


def all_config(db: Session) -> dict:
    return {k: get(db, k) for k in DEFAULTS}


def put(db: Session, key: str, value) -> None:
    row = db.get(Setting, key)
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))
