from pathlib import Path
from io import BytesIO
from tempfile import NamedTemporaryFile
import hashlib
import pandas as pd
from backend.schemas.clinical import FEATURES, CATEGORIES

ROOT = Path(__file__).resolve().parents[1]
CLEVELAND_DATASET = ROOT / "data/heart.csv"
GENERATED_FAT_SUFFIX = b",visceral_fat,visceral_fat_source"
SYNTHETIC_DATASET = ROOT / "data/synthetic_visceral_fat.csv"
SYNTHETIC_MODEL = ROOT / "artifacts/synthetic_visceral_fat.joblib"


def write_atomically(path, write):
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        write(temporary)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def observed_csv_bytes(path):
    """Recover the original, checksummed Cleveland columns from the enriched CSV."""
    content = Path(path).read_bytes()
    if not content.split(b"\n", 1)[0].rstrip(b"\r").endswith(GENERATED_FAT_SUFFIX):
        return content
    observed = []
    for line in content.splitlines(keepends=True):
        row = line.rstrip(b"\r\n")
        columns = row.rsplit(b",", 2)
        if len(columns) != 3:
            raise ValueError("Malformed Cleveland CSV with generated visceral fat.")
        observed.append(columns[0] + line[len(row):])
    return b"".join(observed)


def load_data(path=CLEVELAND_DATASET):
    source = observed_csv_bytes(path)
    raw = pd.read_csv(BytesIO(source))
    if list(raw.columns) != FEATURES + ["target"]:
        raise ValueError("Unexpected feature names or order.")
    if raw.isna().any().any():
        raise ValueError("Training CSV has missing values; inspect source.")
    for col, codes in {**CATEGORIES, "target": [0, 1]}.items():
        if not raw[col].isin(codes).all():
            raise ValueError(f"Unsupported category: {col}")
    clean = raw.drop_duplicates()
    audit = {
        "raw_rows": len(raw),
        "rows": len(clean),
        "duplicates_removed": len(raw) - len(clean),
        "null_cells": int(raw.isna().sum().sum()),
        "class_counts": {str(k): int(v) for k, v in raw.target.value_counts().items()},
        "sha256": hashlib.sha256(source).hexdigest(),
        "categories": CATEGORIES,
        "unusual_codes": {
            "ca=4": int((raw.ca == 4).sum()),
            "thal=0": int((raw.thal == 0).sum()),
        },
        "provenance": "User-supplied CSV. Original cohort and category encoding documentation not supplied; labels remain literal dataset codes.",
    }
    return clean, audit
