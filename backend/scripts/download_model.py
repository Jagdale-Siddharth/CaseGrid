"""Download the small multilingual model once, so the server can use it offline afterwards.
Usage (while online, from backend/):  python -m scripts.download_model
The model (about 220 MB) is stored in MODEL_CACHE_DIR (default: backend/models_cache)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402
from app.services import semantic  # noqa: E402

if __name__ == "__main__":
    print(f"Downloading {settings.embedding_model} into {settings.model_cache_dir} ...")
    semantic._load()
    st = semantic.status()
    if st["state"] == "ready":
        v = semantic.embed(["Lab machines are broken", "प्रयोगशाला की मशीनें खराब हैं", "प्रयोगशाळेतील यंत्रे बंद आहेत"])
        print("OK. Model is ready. Similarity English vs Hindi: %.2f, English vs Marathi: %.2f" % (semantic.cosine(v[0], v[1]), semantic.cosine(v[0], v[2])))
    else:
        print("FAILED:", st["detail"], "\nCheck your internet connection and run this command again.")
        raise SystemExit(1)