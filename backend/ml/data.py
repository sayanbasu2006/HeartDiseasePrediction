from pathlib import Path
import hashlib
import pandas as pd
from backend.schemas.clinical import FEATURES, CATEGORIES

ROOT = Path(__file__).resolve().parents[1]


def load_data(path=ROOT / "data/heart.csv"):
    raw = pd.read_csv(path)
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
        "sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        "categories": CATEGORIES,
        "unusual_codes": {
            "ca=4": int((raw.ca == 4).sum()),
            "thal=0": int((raw.thal == 0).sum()),
        },
        "provenance": "User-supplied CSV. Original cohort and category encoding documentation not supplied; labels remain literal dataset codes.",
    }
    return clean, audit
