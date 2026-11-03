"""Reproducible nested validation; run from project root: python -m backend.ml.train."""

import argparse, json, hashlib, platform
from datetime import datetime, timezone
from pathlib import Path
import joblib, numpy as np, pandas as pd, sklearn
from scipy.special import expit, logsumexp
from sklearn.base import clone
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    brier_score_loss,
    roc_curve,
    precision_recall_curve,
    log_loss,
)
from sklearn.calibration import calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from backend.ml.data import load_data, ROOT
from backend.ml.models import candidates
from backend.schemas.clinical import FEATURES


def metrics(y, p):
    pred = p >= 0.5
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    ece = 0
    for low, high in zip(np.linspace(0, 1, 6)[:-1], np.linspace(0, 1, 6)[1:]):
        mask = (p >= low) & (p <= high if high == 1 else p < high)
        if mask.any():
            ece += mask.mean() * abs(np.mean(y[mask]) - p[mask].mean())
    return {
        "accuracy": accuracy_score(y, pred),
        "precision": precision_score(y, pred, zero_division=0),
        "recall": recall_score(y, pred, zero_division=0),
        "specificity": float(tn / (tn + fp)),
        "f1": f1_score(y, pred, zero_division=0),
        "roc_auc": roc_auc_score(y, p),
        "brier": brier_score_loss(y, p),
        "ece": float(ece),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
    }


def curves(y, p):
    fpr, tpr, _ = roc_curve(y, p)
    precision, recall, _ = precision_recall_curve(y, p)
    obs, mean = calibration_curve(y, p, n_bins=5, strategy="quantile")
    return {
        "roc": [{"x": float(x), "y": float(v)} for x, v in zip(fpr, tpr)],
        "pr": [{"x": float(x), "y": float(v)} for x, v in zip(recall, precision)],
        "calibration": [{"x": float(x), "y": float(v)} for x, v in zip(mean, obs)],
    }


def search(model, grid, X, y):
    # Each outer validation fold encloses parameter selection AND probability calibration.
    return GridSearchCV(
        clone(model),
        grid,
        scoring="neg_brier_score",
        cv=StratifiedKFold(3, shuffle=True, random_state=13),
        n_jobs=1,
    ).fit(X, y)


def research_bma(X, y):
    specs = [
        ["age", "trestbps", "chol"],
        ["age", "trestbps", "chol", "thalach", "oldpeak"],
    ]
    entries = []
    fitted = []
    for cols in specs:
        m = make_pipeline(
            StandardScaler(), LogisticRegression(penalty=None, max_iter=3000)
        ).fit(X[cols], y)
        bic = 2 * log_loss(y, m.predict_proba(X[cols])[:, 1], normalize=False) + (
            len(cols) + 1
        ) * np.log(len(y))
        entries.append({"features": cols, "bic": float(bic)})
        fitted.append((cols, m))
    weights = np.exp(
        -0.5 * np.array([e["bic"] for e in entries])
        - logsumexp(-0.5 * np.array([e["bic"] for e in entries]))
    )
    for e, w in zip(entries, weights):
        e["weight"] = float(w)
    return {
        "experimental": True,
        "method": "BIC evidence approximation among unpenalized continuous-feature logistic specifications, fitted on development data only. Not ordinary soft voting; not clinically validated. Not eligible for primary prediction.",
        "specifications": entries,
    }, fitted


def train(data=None, out=None):
    out = Path(out or ROOT / "artifacts")
    out.mkdir(parents=True, exist_ok=True)
    if (out / "metadata.json").exists():
        raise FileExistsError(
            "Completed experiment exists. Use --out with a new directory; do not repeatedly inspect the holdout."
        )
    df, audit = load_data(data or ROOT / "data/heart.csv")
    development, test = train_test_split(
        df, test_size=0.2, stratify=df.target, random_state=42
    )
    X, y = development[FEATURES], development.target
    folds = list(StratifiedKFold(4, shuffle=True, random_state=29).split(X, y))
    comparisons = []
    oof = {}
    best_params = {}
    for name, (model, grid) in candidates().items():
        print("Validating", name, flush=True)
        p = np.zeros(len(X))
        fm = []
        for tr, va in folds:
            fit = search(model, grid, X.iloc[tr], y.iloc[tr])
            p[va] = fit.predict_proba(X.iloc[va])[:, 1]
            fm.append(metrics(y.iloc[va].to_numpy(), p[va]))
        full = metrics(y.to_numpy(), p)
        comparisons.append(
            {
                "name": name,
                **full,
                "auc_sd": float(np.std([m["roc_auc"] for m in fm], ddof=1)),
                "folds": fm,
                "curves": curves(y.to_numpy(), p),
            }
        )
        oof[name] = p
    # Prespecified utility balances calibration, discrimination and missed positive labels.
    for c in comparisons:
        c["selection_utility"] = c["roc_auc"] - 0.5 * c["brier"] + 0.1 * c["recall"]
    selected = max(comparisons, key=lambda c: c["selection_utility"])
    name = selected["name"]
    print("Selected", name, flush=True)
    spec, grid = candidates()[name]
    fit = search(spec, grid, X, y)
    model = fit.best_estimator_
    # Only this selected model sees holdout observations, once.
    probability = model.predict_proba(test[FEATURES])[:, 1]
    holdout = metrics(test.target.to_numpy(), probability)
    baseline = float(y.mean() * (1 - y.mean()))
    calibration_adequate = selected["brier"] < baseline and selected["ece"] <= 0.1
    bma, bma_models = research_bma(X, y)
    background = X.sample(n=min(20, len(X)), random_state=3)
    joblib.dump(
        {
            "model": model,
            "background": background,
            "features": FEATURES,
            "bma_models": bma_models,
            "bma_weights": [s["weight"] for s in bma["specifications"]],
        },
        out / "model.joblib",
    )
    version = (
        "1.0-"
        + hashlib.sha256(
            (audit["sha256"] + name + sklearn.__version__).encode()
        ).hexdigest()[:10]
    )
    metadata = {
        "version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "selected_model": name,
        "features": FEATURES,
        "dataset": audit,
        "development_rows": len(X),
        "holdout_rows": len(test),
        "threshold": 0.5,
        "selection_rationale": "Four outer stratified folds; three inner folds optimize Brier loss. Utility = OOF ROC-AUC - 0.5 × OOF Brier + 0.1 × OOF recall. All candidate probability calibration and voting weight fitting occur inside each outer training fold. Fixed threshold 0.5. Holdout evaluated for selected model only.",
        "calibration_adequate": bool(calibration_adequate),
        "calibration_criterion": "Development OOF ECE <= 0.10 (5 fixed bins) and Brier below training prevalence baseline. Exploratory check, not clinical validation.",
        "best_params": fit.best_params_,
        "ranges": {c: [float(X[c].min()), float(X[c].max())] for c in FEATURES},
        "versions": {
            "python": platform.python_version(),
            "scikit-learn": sklearn.__version__,
        },
        "split": {
            "development_indices": development.index.tolist(),
            "holdout_indices": test.index.tolist(),
            "outer_folds": [
                {
                    "train": development.index[tr].tolist(),
                    "validation": development.index[va].tolist(),
                }
                for tr, va in folds
            ],
        },
    }
    evaluation = {
        "comparisons": comparisons,
        "holdout": {
            "name": name,
            "n": len(test),
            **holdout,
            "curves": curves(test.target.to_numpy(), probability),
        },
        "research_bma": bma,
    }
    (out / "metadata.json").write_text(json.dumps(metadata, indent=2))
    (out / "metrics.json").write_text(json.dumps(evaluation, indent=2))
    pd.DataFrame(
        {"source_index": test.index, "label": test.target, "score": probability}
    ).to_csv(out / "holdout_predictions.csv", index=False)
    distributions = {
        c: [
            {"value": float(k), "count": int(v)}
            for k, v in df[c].value_counts().sort_index().items()
        ]
        for c in FEATURES
    }
    (out / "distributions.json").write_text(
        json.dumps(
            {
                "distributions": distributions,
                "correlation": df[FEATURES].corr().round(3).to_dict(),
            },
            indent=2,
        )
    )
    print(json.dumps({"selected": name, "holdout": holdout}, indent=2), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data")
    parser.add_argument("--out")
    args = parser.parse_args()
    train(args.data, args.out)
