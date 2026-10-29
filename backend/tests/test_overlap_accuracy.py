"""Overlap accuracy is MEASURED on a labelled set, never claimed. Guard against regressions."""
from scripts.eval_overlap import evaluate


def test_precision_recall_measured_on_labelled_pairs():
    r = evaluate(None, "all")
    assert r["pairs"] == 40 and r["tp"] + r["fp"] + r["fn"] + r["tn"] == 40
    assert r["precision"] >= 0.9, r  # suggestions should rarely be wrong
    assert r["recall"] >= 0.7, r     # and should find most related pairs
