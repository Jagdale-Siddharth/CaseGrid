"""Careful institution name matching. The stable institution code is always the primary key;
name matching only produces candidates for a human to verify."""
import re
from difflib import SequenceMatcher

ABBR = {"inst": "institute", "instt": "institute", "tech": "technology", "technical": "technology", "engg": "engineering",
        "eng": "engineering", "coll": "college", "univ": "university", "mgmt": "management", "sci": "science",
        "poly": "polytechnic", "polytechnique": "polytechnic", "pharm": "pharmacy"}
STOP = {"of", "the", "and", "for", "&"}


def normalise(name: str) -> str:
    words = re.findall(r"[a-z0-9]+", name.lower())
    return " ".join(ABBR.get(w, w) for w in words if w not in STOP)


def confidence(a: str, b: str) -> float:
    na, nb = normalise(a), normalise(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    ta, tb = set(na.split()), set(nb.split())
    jac = len(ta & tb) / len(ta | tb)
    return round(max(SequenceMatcher(None, na, nb).ratio(), jac), 3)


def find_matches(institutions, name: str, min_conf: float = 0.6):
    out = []
    for i in institutions:
        best, why = confidence(name, i.name), "Similar name"
        for alias in (i.aliases or []):
            c = confidence(name, alias)
            if c > best:
                best, why = c, f"Matches alias '{alias}'"
        if best == 1.0:
            why = "Exact match after normalising abbreviations" if why == "Similar name" else why
        if best >= min_conf:
            out.append((i, best, why))
    return sorted(out, key=lambda t: -t[1])
