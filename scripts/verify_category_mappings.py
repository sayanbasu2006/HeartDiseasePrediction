"""Verify transformations against the primary UCI Cleveland source; never infer meanings from frequency."""

from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import hashlib, json
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
FEATURES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]


def verify(archive):
    with ZipFile(archive) as z:
        content = z.read("processed.cleveland.data")
    source = pd.read_csv(
        BytesIO(content), header=None, names=FEATURES + ["diagnosis"], na_values="?"
    )
    local = pd.read_csv(ROOT / "backend/data/heart.csv").reset_index(names="local_row")
    keys = ["age", "sex", "trestbps", "chol", "fbs", "thalach", "exang", "oldpeak"]
    matches = local.merge(
        source, on=keys, how="left", suffixes=("_local", "_uci"), indicator=True
    )
    assert (
        matches.local_row.nunique() == len(local)
        and (matches["_merge"] == "both").all()
    )
    expected = {
        "cp": {0: 4, 1: 2, 2: 3, 3: 1},
        "restecg": {0: 2, 1: 0, 2: 1},
        "slope": {0: 3, 1: 2, 2: 1},
        "ca": {0: 0, 1: 1, 2: 2, 3: 3, 4: None},
        "thal": {0: None, 1: 6, 2: 3, 3: 7},
    }
    observations = {}
    for field, mapping in expected.items():
        observations[field] = {}
        for value, original in mapping.items():
            actual = matches.loc[matches[field + "_local"] == value, field + "_uci"]
            assert len(actual) > 0
            assert (
                actual.isna().all() if original is None else (actual == original).all()
            )
            observations[field][str(value)] = {
                "uci_value": original,
                "matching_rows": len(actual),
            }
    assert (matches.loc[matches.target == 1, "diagnosis"] == 0).all()
    assert (matches.loc[matches.target == 0, "diagnosis"] > 0).all()
    audit = {
        "source_url": "https://archive.ics.uci.edu/dataset/45/heart+disease",
        "download_url": "https://archive.ics.uci.edu/static/public/45/heart+disease.zip",
        "source_member": "processed.cleveland.data",
        "source_sha256": hashlib.sha256(content).hexdigest(),
        "local_sha256": hashlib.sha256(
            (ROOT / "backend/data/heart.csv").read_bytes()
        ).hexdigest(),
        "matched_local_rows": int(matches.local_row.nunique()),
        "method": "Match on eight unchanged fields, then require unanimous agreement for every observed transformed category. Match labels to the original diagnosis field. Duplicate local records are retained for this audit.",
        "mappings": observations,
        "target_meanings": {
            "0": "Disease present in source diagnosis",
            "1": "No disease in source diagnosis",
        },
        "missing_markers": {"ca": 4, "thal": 0},
    }
    (ROOT / "backend/data/reference/processed.cleveland.data").write_bytes(content)
    (ROOT / "backend/data/category_mapping_audit.json").write_text(
        json.dumps(audit, indent=2) + "\n"
    )
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("archive")
    verify(p.parse_args().archive)
