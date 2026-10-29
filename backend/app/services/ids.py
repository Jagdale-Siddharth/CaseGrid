from sqlalchemy.orm import Session

from ..models import Counter


def next_value(db: Session, name: str) -> int:
    row = db.get(Counter, name, with_for_update=True)
    if row is None:
        row = Counter(name=name, value=0)
        db.add(row)
        db.flush()
    row.value += 1
    db.flush()
    return row.value
