import json
from functools import lru_cache
from datetime import datetime, timezone
import joblib, numpy as np, pandas as pd, sklearn
from backend.ml.data import ROOT, SYNTHETIC_MODEL
from backend.schemas.clinical import Patient, SyntheticPatient, SYNTHETIC_FEATURES, DISCLAIMER
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


@lru_cache(maxsize=1)
def synthetic_artifact():
    if not SYNTHETIC_MODEL.is_file():
        raise RuntimeError("Synthetic model unavailable. Run python -m backend.ml.train_synthetic.")
    bundle = joblib.load(SYNTHETIC_MODEL)
    meta = bundle["metadata"]
    if meta["scikit_learn"] != sklearn.__version__:
        raise RuntimeError("Synthetic model library version mismatch. Retrain in this environment.")
    if meta["synthetic"] is not True or bundle["features"] != SYNTHETIC_FEATURES:
        raise RuntimeError("The bundled synthetic model does not match the simulation inputs.")
    return bundle


def explain(patient, artifact, *, synthetic=False):
    """Monte Carlo interventional Shapley approximation in score space.
    Uses development background rows; returns additive contributions.
    Correlations can make hybrid reference observations unrealistic.
    """
    features = artifact["features"]
    x = np.array([patient[f] for f in features])
    bg = artifact["background"][features]
    rng = np.random.default_rng(41)
    rows = []
    orders = []
    repeats = 24
    for i in range(repeats):
        z = bg.iloc[i % len(bg)].to_numpy().copy()
        order = rng.permutation(len(features))
        orders.append(order)
        rows.append(z.copy())
        for j in order:
            z[j] = x[j]
            rows.append(z.copy())
    scores = (
        artifact["model"]
        .predict_proba(pd.DataFrame(rows, columns=features))[:, 1]
        .reshape(repeats, len(features) + 1)
    )
    # Source class 1 is no disease; explanations use the disease-present class consistently.
    scores = 1.0 - scores
    contributions = np.zeros(len(features))
    for i, order in enumerate(orders):
        contributions[order] += np.diff(scores[i]) / repeats
    score_name = "Higher simulated-pattern" if synthetic else "Disease-pattern"
    return {
        "method": (
            "Approximate interventional Shapley values using 24 deterministic paths over "
            f"development background records. {score_name} contributions sum to the "
            "displayed score minus its reference. Correlated-feature hybrids and sampling "
            "introduce limitations."
        ),
        "reference_score": float(scores[:, 0].mean()),
        "features": sorted(
            [
                {"feature": f, "value": patient[f], "contribution": float(c)}
                for f, c in zip(features, contributions)
            ],
            key=lambda z: abs(z["contribution"]),
            reverse=True,
        ),
    }


def predict(patient: Patient, with_explanation=True):
    return _predict(patient, *artifacts(), with_explanation=with_explanation)


def predict_synthetic(patient: SyntheticPatient):
    bundle = synthetic_artifact()
    return _predict(patient, bundle, bundle["metadata"], with_explanation=True)


def _predict(patient, a, m, *, with_explanation):
    data = patient.model_dump()
    features = a["features"]
    p = float(a["model"].predict_proba(pd.DataFrame([data], columns=features))[0, 1])
    positive = p >= m["threshold"]
    synthetic = m.get("synthetic", False)
    if synthetic:
        description = "Lower simulated pattern" if positive else "Higher simulated pattern"
        score_label = "Higher simulated-pattern score"
        definition = "This score describes an artificial label from the data generator. It has no medical interpretation."
        warnings = [
            "Model demonstration. A simulator generated the measurements and labels.",
            "The generator assigns visceral fat a predefined effect on the simulated label. Holdout performance measures agreement with that rule.",
        ]
    else:
        description = "No-disease dataset pattern" if positive else "Disease-present dataset pattern"
        score_label = "Disease-pattern model score"
        definition = "Experimental classifier output for the source disease-present class. This percentage is not your personal medical risk and is not a clinically validated probability of present or future heart disease."
        warnings = [
            DISCLAIMER,
            "Categories and outcome meanings were verified against the UCI Cleveland source. This model has no external clinical validation.",
        ]
        if patient.visceral_fat is not None:
            warnings.append("Visceral fat is recorded as a device index and is not used by this model.")
    for f in features:
        value = data[f]
        if not m["ranges"][f][0] <= value <= m["ranges"][f][1]:
            name = "Visceral fat (device index)" if f == "visceral_fat" else field_label(f)
            warnings.append(f"{name} is outside the development-data range.")
    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "predicted_class": int(positive),
        "label": f"Model result: {description.lower()}.",
        "class_description": description,
        "model_score": p,  # Backward-compatible raw score for source class 1 (no disease).
        "no_disease_class_score": p,
        "disease_class_score": 1.0 - p,
        "score_label": score_label,
        "score_definition": definition,
        "calibration_adequate": m["calibration_adequate"],
        "model_version": m["version"],
        "model_name": m["selected_model"],
        "input_completeness": 1.0,
        "measurements": data,
        "limitations": warnings,
        "explanation": explain(data, a, synthetic=synthetic) if with_explanation else None,
    }
    if synthetic:
        result.update(
            synthetic=True,
            holdout_accuracy=m["metrics"]["with_visceral_fat"]["accuracy"],
            holdout_rows=m["metrics"]["holdout_rows"],
        )
    return result
