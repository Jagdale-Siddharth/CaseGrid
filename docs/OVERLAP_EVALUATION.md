# Overlap detection: measured accuracy

Run it yourself: `cd backend && python -m scripts.eval_overlap` (the test suite also guards it).

## Method
* Labelled set: `backend/tests/data/labelled_pairs.json`, 40 synthetic complaint pairs for one institution
  (20 related, 20 unrelated, including "same institution, different issue" negatives such as lab equipment vs fees).
  Pairs use different wording, different categories and different bureaus.
* Split: odd ids = development half (used to choose the score threshold), even ids = held-out half (used only for reporting).
* A pair counts as predicted-related when the system would create a suggestion (`overlap.is_suggestion`).

## Results
| Threshold | Evaluated on | TP | FP | FN | TN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|---|
| 0.45 (initial guess) | held-out 20 pairs | 5 | 0 | 5 | 10 | 1.00 | 0.50 | 0.67 |
| **0.30 (chosen on dev half, now the default)** | held-out 20 pairs | 8 | 0 | 2 | 10 | **1.00** | **0.80** | **0.89** |
| 0.30 | all 40 pairs | 16 | 0 | 4 | 20 | 1.00 | 0.80 | 0.89 |

## Read this before quoting the numbers
* The set is small (40 pairs, 20 per half) and was written by the developers, so it is **optimistic**. Confidence intervals are wide:
  8/10 recall on the held-out half could plausibly be anywhere from roughly 50% to 95%.
* The default method is TF-IDF cosine over a normalised vocabulary with a synonym table, plus rules (same institution, category,
  timing). It is not a neural model. The 4 missed pairs use wording the synonym table does not cover.
* Optional sentence-embedding similarity (`USE_EMBEDDINGS=true`, needs `sentence-transformers`) is implemented but was **not
  evaluated** here because the model cannot be downloaded in the build environment. Measure it with the same script before relying on it.
* Precision of 1.00 means no false positive occurred on this set, not that none will occur on real data. The system only suggests; an
  officer always decides.
