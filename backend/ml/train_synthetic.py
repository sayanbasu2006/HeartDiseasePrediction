"""Generate an entirely simulated cohort and evaluate a visceral-fat demonstration."""

import argparse
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, roc_auc_score

from backend.ml.data import SYNTHETIC_DATASET, SYNTHETIC_MODEL, write_atomically
from backend.ml.models import pipeline
from backend.schemas.clinical import (
    BOUNDS,
    CONTINUOUS,
    FEATURES,
    SYNTHETIC_FEATURES,
    SYNTHETIC_INDEX_MAX,
    SYNTHETIC_INDEX_MIN,
)

SEED = 20261117
TRAIN_ROWS = 3200
HOLDOUT_ROWS = 800
TARGET = "simulated_label"


def simulate(rng, n):
    age = np.rint(rng.normal(55, 11, n)).clip(*BOUNDS["age"]).astype(int)
    age_offset = age - 55
    fat = np.rint(rng.normal(14 + 0.10 * age_offset, 5, n)).clip(
        SYNTHETIC_INDEX_MIN, SYNTHETIC_INDEX_MAX
    )
    records = pd.DataFrame(
        {
            "age": age,
            "sex": rng.integers(0, 2, n),
            "cp": rng.integers(0, 4, n),
            "trestbps": np.rint(rng.normal(129 + 0.30 * age_offset, 15, n)),
            "chol": np.rint(rng.normal(225 + 0.55 * age_offset, 34, n)),
            "fbs": rng.binomial(1, 0.16, n),
            "restecg": rng.choice(3, n, p=[0.52, 0.40, 0.08]),
            "thalach": np.rint(rng.normal(154 - 0.64 * age_offset, 18, n)),
            "exang": rng.binomial(1, 0.32, n),
            "oldpeak": rng.gamma(1.6, 0.75, n).round(2),
            "slope": rng.integers(0, 3, n),
            "ca": rng.choice(4, n, p=[0.56, 0.25, 0.13, 0.06]),
            "thal": rng.choice([1, 2, 3], n, p=[0.08, 0.56, 0.36]),
            "visceral_fat": fat,
        }
    )
    for field, (low, high) in BOUNDS.items():
        records[field] = records[field].clip(low, high)

    # The coefficients and noise describe the simulation only.
    signal = (
        1.20 * (records.visceral_fat - 14) / 5
        + 0.30 * age_offset / 11
        + 0.22 * (records.trestbps - 129) / 15
        + 0.20 * (records.chol - 225) / 34
        - 0.36 * (records.thalach - 154) / 18
        + 0.42 * (records.oldpeak - 1.2)
        + 0.30 * (records.exang - 0.32)
        + 0.24 * (records.ca - 0.7)
        + np.array([-0.25, 0.05, -0.05, 0.25])[records.cp]
    )
    # Class 1 is the lower simulated pattern, the positive score slot used by CardioLens.
    records[TARGET] = (signal + rng.normal(0, 0.27, n) < 0).astype(int)
    return records


def evaluate(model, holdout, features):
    y = holdout[TARGET]
    p = model.predict_proba(holdout[features])[:, 1]
    return {
        "accuracy": accuracy_score(y, p >= 0.5),
        "balanced_accuracy": balanced_accuracy_score(y, p >= 0.5),
        "roc_auc": roc_auc_score(y, p),
    }


def train(dataset=SYNTHETIC_DATASET, artifact=SYNTHETIC_MODEL):
    dataset, artifact = Path(dataset), Path(artifact)
    if dataset.resolve() == artifact.resolve():
        raise ValueError("The dataset and model need different output paths.")
    train_seed, holdout_seed = np.random.SeedSequence(SEED).spawn(2)
    development = simulate(np.random.default_rng(train_seed), TRAIN_ROWS)
    holdout = simulate(np.random.default_rng(holdout_seed), HOLDOUT_ROWS)
    records = pd.concat(
        [development.assign(split="training"), holdout.assign(split="holdout")],
        ignore_index=True,
    )
    records.insert(0, "record_id", [f"synthetic-{i:04d}" for i in range(1, len(records) + 1)])
    csv = records[["record_id", "split", *SYNTHETIC_FEATURES, TARGET]].to_csv(index=False)
    sha256 = hashlib.sha256(csv.encode("utf-8")).hexdigest()

    model = pipeline(
        LogisticRegression(max_iter=2000), continuous=[*CONTINUOUS, "visceral_fat"]
    ).fit(development[SYNTHETIC_FEATURES], development[TARGET])
    baseline = pipeline(LogisticRegression(max_iter=2000)).fit(
        development[FEATURES], development[TARGET]
    )
    metrics = {
        "training_rows": TRAIN_ROWS,
        "holdout_rows": HOLDOUT_ROWS,
        "with_visceral_fat": evaluate(model, holdout, SYNTHETIC_FEATURES),
        "without_visceral_fat": evaluate(baseline, holdout, FEATURES),
    }
    bundle = {
        "model": model,
        "background": development[SYNTHETIC_FEATURES].sample(n=20, random_state=3),
        "features": SYNTHETIC_FEATURES,
        "example": development.iloc[0][SYNTHETIC_FEATURES].to_dict(),
        "metadata": {
            "synthetic": True,
            "version": f"synthetic-v1-{sha256[:10]}",
            "selected_model": "Synthetic logistic regression with visceral fat",
            "threshold": 0.5,
            "calibration_adequate": False,
            "ranges": {
                name: [float(development[name].min()), float(development[name].max())]
                for name in SYNTHETIC_FEATURES
            },
            "scikit_learn": sklearn.__version__,
            "dataset_sha256": sha256,
            "seed": SEED,
            "metrics": metrics,
        },
    }
    write_atomically(dataset, lambda path: path.write_bytes(csv.encode("utf-8")))
    write_atomically(artifact, lambda path: joblib.dump(bundle, path, compress=3))
    return bundle["metadata"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=SYNTHETIC_DATASET)
    parser.add_argument("--artifact", type=Path, default=SYNTHETIC_MODEL)
    args = parser.parse_args()
    print(json.dumps(train(args.dataset, args.artifact), indent=2))
