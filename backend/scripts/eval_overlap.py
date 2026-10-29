"""Measure overlap-detection precision/recall on the labelled test set.
Usage: python -m scripts.eval_overlap   (run from backend/)"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services import config_svc, overlap  # noqa: E402

DATA = Path(__file__).resolve().parents[1] / "tests" / "data" / "labelled_pairs.json"


def evaluate(threshold=None, split="all"):
    pairs = json.loads(DATA.read_text())
    if split == "dev":
        pairs_use = [p for p in pairs if p["id"] % 2 == 1]
    elif split == "test":
        pairs_use = [p for p in pairs if p["id"] % 2 == 0]
    else:
        pairs_use = pairs
    corpus_pairs = pairs  # idf is computed over the whole corpus of complaint texts, labels are never used
    cfg = {**config_svc.DEFAULTS}
    if threshold is not None:
        cfg["overlap_threshold"] = threshold
    sim = overlap.Similarity([p[k] for p in corpus_pairs for k in ("text_a", "text_b")])
    base = date(2026, 9, 1)
    tp = fp = fn = tn = 0
    errors = []
    for p in pairs_use:
        a = dict(institution_id=1, institution_code="INS-0001", category=p["category_a"], subject="", description=p["text_a"], registered_on=base, bureau="A")
        b = dict(a, category=p["category_b"], description=p["text_b"], registered_on=base + timedelta(days=p["days_apart"]), bureau="B")
        score, sig = overlap.score_pair(a, b, sim, cfg)
        pred = overlap.is_suggestion(score, sig, cfg)
        if pred and p["related"]: tp += 1
        elif pred and not p["related"]: fp += 1; errors.append(("FALSE POSITIVE", p["id"], round(score, 2)))
        elif not pred and p["related"]: fn += 1; errors.append(("MISSED", p["id"], round(score, 2)))
        else: tn += 1
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"pairs": len(pairs_use), "tp": tp, "fp": fp, "fn": fn, "tn": tn, "precision": round(prec, 3), "recall": round(rec, 3), "f1": round(f1, 3), "errors": errors}


def evaluate_multilingual():
    """English / Hindi / Marathi pairs scored with the multilingual model (needs the model downloaded once)."""
    from app.services import semantic
    semantic.warm_up(); import time
    for _ in range(300):  # wait for the background load (up to ~30 s)
        if semantic.ready() or semantic.status()["state"] == "unavailable":
            break
        time.sleep(0.1)
    if not semantic.ready():
        return {"error": "Model not available: " + (semantic.status()["detail"] or "still loading") + ". Run `python -m scripts.download_model` while online."}
    pairs = json.loads((DATA.parent / "multilingual_pairs.json").read_text())
    cfg = {**config_svc.DEFAULTS}
    sim = overlap.Similarity([])
    base = date(2026, 9, 1)
    tp = fp = fn = tn = 0
    rows = []
    for p in pairs:
        va, vb = semantic.embed([p["text_a"], p["text_b"]])
        cos = semantic.cosine(va, vb)
        a = dict(institution_id=1, institution_code="INS-0001", category=p["category_a"], subject="", description=p["text_a"], registered_on=base, bureau="A")
        b = dict(a, category=p["category_b"], description=p["text_b"], registered_on=base + timedelta(days=p["days_apart"]), bureau="B")
        score, sig = overlap.score_pair(a, b, sim, cfg, cos)
        pred = overlap.is_suggestion(score, sig, cfg)
        rows.append((p["id"], p["related"], pred, round(cos, 2), round(score, 2)))
        tp += pred and p["related"]; fp += pred and not p["related"]; fn += (not pred) and p["related"]; tn += (not pred) and not p["related"]
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    return {"pairs": len(pairs), "tp": tp, "fp": fp, "fn": fn, "tn": tn, "precision": round(prec, 3), "recall": round(rec, 3), "rows": rows}


if __name__ == "__main__":
    if "--multilingual" in sys.argv:
        r = evaluate_multilingual()
        if "error" in r:
            print(r["error"]); raise SystemExit(1)
        print(f"Multilingual set: {r['pairs']} pairs  TP={r['tp']} FP={r['fp']} FN={r['fn']} TN={r['tn']}  precision={r['precision']} recall={r['recall']}")
        print("id  related  suggested  raw_cosine  score   (tune SEMANTIC_FLOOR / SEMANTIC_CEILING in .env if results look off)")
        for row in r["rows"]:
            print(f"{row[0]:>2}  {str(row[1]):<8} {str(row[2]):<10} {row[3]:<11} {row[4]}")
        raise SystemExit(0)
    grid = (0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60)
    dev = {t: evaluate(t, "dev") for t in grid}
    best = max(grid, key=lambda t: (dev[t]["f1"], -t))
    print("Dev half (odd ids) - threshold sweep:")
    for t in grid:
        print(f"  {t:.2f}: P={dev[t]['precision']:.2f} R={dev[t]['recall']:.2f} F1={dev[t]['f1']:.2f}")
    print(f"Chosen threshold on dev half: {best}")
    for name, thr in (("default 0.45", 0.45), (f"dev-chosen {best}", best)):
        r = evaluate(thr, "test")
        print(f"\nHELD-OUT test half (even ids), threshold {name}: pairs={r['pairs']} TP={r['tp']} FP={r['fp']} FN={r['fn']} TN={r['tn']}  precision={r['precision']} recall={r['recall']} f1={r['f1']}")
    r = evaluate(None, "all")
    print(f"\nAll 40 pairs at the configured default: precision={r['precision']} recall={r['recall']}")