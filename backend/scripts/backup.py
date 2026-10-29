"""Export seeded data + configuration to JSON so the demo survives a database/service failure.
   python -m scripts.backup [output_dir]       (default ../demo_backup)
Restore: `python -m app.seed --reset` rebuilds the identical demo data set from code, offline."""
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal  # noqa: E402
from app.services.backup import build_backup  # noqa: E402

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "demo_backup"
out.mkdir(parents=True, exist_ok=True)
with SessionLocal() as db:
    data = build_backup(db)
(out / "demo_data_export.json").write_text(json.dumps(data, indent=2, default=str))
(out / "application_config.json").write_text(json.dumps(data["config"], indent=2))
print(f"Backed up {len(data['complaints'])} complaints, {len(data['institutions'])} institutions to {out}")
