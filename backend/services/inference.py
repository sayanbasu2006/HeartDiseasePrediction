import json
from functools import lru_cache
from datetime import datetime, timezone
import joblib, numpy as np, pandas as pd, sklearn
from backend.ml.data import ROOT
from backend.schemas.clinical import Patient, FEATURES, DISCLAIMER
from backend.schemas.labels import AUDIT, field_label


@lru_cache(maxsize=1)
def artifacts():
    directory = ROOT / "artifacts"
    if not (directory / "metadata.json").exists():
        raise RuntimeError("Model not trained. Run python -m backend.ml.train.")
    meta = json.loads((directory / "metadata.json").read_text())
    if meta["versions"]["scikit-learn"] != sklearn.__version__:
        raise RuntimeError(
            "Model library version mismatch. Use the documented environment."
        )
    if meta["dataset"]["sha256"] != AUDIT["local_sha256"]:
        raise RuntimeError(
            "The model dataset does not match the verified category dictionary."
        )
    return joblib.load(directory / "model.joblib"), meta


def explain(patient, artifact):
    """Monte Carlo interventional Shapley approximation in score space.
    Uses actual development background rows; returns additive contributions.
    Correlations can make hybrid reference observations unrealistic.
    """
    x = np.array([patient[f] for f in FEATURES])
    bg = artifact["background"]
    rng = np.random.default_rng(41)
    rows = []
    orders = []
    repeats = 24
    for i in range(repeats):
        z = bg.iloc[i % len(bg)].to_numpy().copy()
        order = rng.permutation(len(FEATURES))
        orders.append(order)
        rows.append(z.copy())
        for j in order:
            z[j] = x[j]
            rows.append(z.copy())
    scores = (
        artifact["model"]
        .predict_proba(pd.DataFrame(rows, columns=FEATURES))[:, 1]
        .reshape(repeats, len(FEATURES) + 1)
    )
    # Source class 1 is no disease; explanations use the disease-present class consistently.
    scores = 1.0 - scores
    contributions = np.zeros(len(FEATURES))
    for i, order in enumerate(orders):
        contributions[order] += np.diff(scores[i]) / repeats
    return {
        "method": "Approximate interventional Shapley values: 24 deterministic sampled paths over development background records. Disease-pattern score contributions sum to the disease-class score minus its reference. Not causal; correlated-feature hybrids and sampling introduce limitations.",
        "reference_score": float(scores[:, 0].mean()),
        "features": sorted(
            [
                {"feature": f, "value": patient[f], "contribution": float(c)}
                for f, c in zip(FEATURES, contributions)
            ],
            key=lambda z: abs(z["contribution"]),
            reverse=True,
        ),
    }


def predict(patient: Patient, with_explanation=True):
    data = patient.model_dump()
    a, m = artifacts()
    p = float(a["model"].predict_proba(pd.DataFrame([data], columns=FEATURES))[0, 1])
    positive = p >= m["threshold"]
    warnings = [
        DISCLAIMER,
        "Categories and outcome meanings were verified against the UCI Cleveland source. This model has no external clinical validation.",
    ]
    for f, value in data.items():
        if not m["ranges"][f][0] <= value <= m["ranges"][f][1]:
            warnings.append(f"{field_label(f)} is outside the development-data range.")
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "predicted_class": int(positive),
        "label": (
            "Model result: no-disease dataset pattern."
            if positive
            else "Model result: disease-present dataset pattern."
        ),
        "class_description": (
            "No-disease dataset pattern"
            if positive
            else "Disease-present dataset pattern"
        ),
        "model_score": p,  # Backward-compatible raw score for source class 1 (no disease).
        "no_disease_class_score": p,
        "disease_class_score": 1.0 - p,
        "score_label": "Disease-pattern model score",
        "score_definition": "Experimental classifier output for the source disease-present class. This percentage is not your personal medical risk and is not a clinically validated probability of present or future heart disease.",
        "calibration_adequate": m["calibration_adequate"],
        "model_version": m["version"],
        "model_name": m["selected_model"],
        "input_completeness": 1.0,
        "measurements": data,
        "limitations": warnings,
        "explanation": explain(data, a) if with_explanation else None,
    }
