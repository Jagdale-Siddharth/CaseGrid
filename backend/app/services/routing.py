"""Configurable routing. Never invents a destination: anything unclear -> manual review queue."""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Bureau, Institution, RoutingRule


@dataclass
class RouteDecision:
    bureau: Bureau
    manual_review: bool
    note: str


def review_bureau(db: Session) -> Bureau:
    return db.scalars(select(Bureau).where(Bureau.is_review_queue.is_(True))).first()


def route(db: Session, category: str, institution: Institution, extra_subjects: list[str] | None = None) -> RouteDecision:
    review = review_bureau(db)
    subjects = {category, *(extra_subjects or [])}
    if len(subjects) > 1:
        return RouteDecision(review, True, f"Multiple subjects ({', '.join(sorted(subjects))}); sent for manual review")
    rules = db.scalars(select(RoutingRule).where(RoutingRule.category == category, RoutingRule.active.is_(True))).all()
    # jurisdiction: a rule with a state applies only to that state; a rule without a state applies everywhere
    matching = [r for r in rules if r.state is None or r.state == institution.state]
    specific = [r for r in matching if r.state is not None]
    candidates = specific or matching
    targets = {r.bureau_id for r in candidates}
    if not candidates:
        return RouteDecision(review, True, f"No routing rule for category '{category}'; sent for manual review")
    if len(targets) > 1:
        return RouteDecision(review, True, "Conflicting routing rules; sent for manual review")
    rule = candidates[0]
    if rule.bureau.is_review_queue:
        return RouteDecision(rule.bureau, True, f"Rule for '{category}' maps to manual review")
    tag = "verified rule" if rule.is_verified else "PROTOTYPE rule (unverified)"
    return RouteDecision(rule.bureau, False, f"Routed to {rule.bureau.name} by {tag} for '{category}'")
