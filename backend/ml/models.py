import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder, SplineTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier,
    AdaBoostClassifier,
    GradientBoostingClassifier,
)
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import brier_score_loss
from backend.schemas.clinical import CONTINUOUS, CATEGORIES


def pipeline(estimator, spline=False):
    numeric = [("impute", SimpleImputer(strategy="median"))]
    if spline:
        numeric.append(
            ("spline", SplineTransformer(n_knots=3, degree=2, include_bias=False))
        )
    numeric.append(("scale", StandardScaler()))
    pre = ColumnTransformer(
        [
            ("continuous", Pipeline(numeric), CONTINUOUS),
            (
                "categories",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        (
                            "encode",
                            OneHotEncoder(
                                categories=list(CATEGORIES.values()),
                                handle_unknown="error",
                                sparse_output=False,
                            ),
                        ),
                    ]
                ),
                list(CATEGORIES),
            ),
        ]
    )
    return Pipeline([("preprocess", pre), ("classifier", estimator)])


def calibrated(estimator):
    return CalibratedClassifierCV(
        estimator=estimator,
        method="sigmoid",
        cv=StratifiedKFold(3, shuffle=True, random_state=17),
        ensemble=True,
    )


class OOFVoting(ClassifierMixin, BaseEstimator):
    """Weights learned inside each fit using only that fit's out-of-fold predictions."""

    def __init__(self, seed=42):
        self.seed = seed

    def fit(self, X, y):
        specs = [
            pipeline(LogisticRegression(C=1, max_iter=2000)),
            pipeline(
                RandomForestClassifier(
                    n_estimators=60,
                    max_depth=4,
                    min_samples_leaf=4,
                    random_state=self.seed,
                    n_jobs=1,
                )
            ),
            pipeline(
                GradientBoostingClassifier(
                    n_estimators=50, max_depth=1, random_state=self.seed
                )
            ),
        ]
        self.models_ = []
        losses = []
        for spec in specs:
            model = calibrated(spec)
            p = cross_val_predict(
                model,
                X,
                y,
                cv=StratifiedKFold(3, shuffle=True, random_state=23),
                method="predict_proba",
                n_jobs=1,
            )[:, 1]
            losses.append(brier_score_loss(y, p))
            self.models_.append(model.fit(X, y))
        self.weights_ = np.exp(-20 * np.array(losses))
        self.weights_ /= self.weights_.sum()
        self.classes_ = np.array([0, 1])
        self.n_features_in_ = X.shape[1]
        return self

    def predict_proba(self, X):
        return sum(w * m.predict_proba(X) for w, m in zip(self.weights_, self.models_))

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


def candidates():
    specs = {
        "Logistic regression": (
            LogisticRegression(max_iter=2000),
            {"estimator__classifier__C": [0.1, 1]},
        ),
        "CART": (
            DecisionTreeClassifier(random_state=42, min_samples_leaf=8),
            {"estimator__classifier__max_depth": [2, 4]},
        ),
        "Random forest": (
            RandomForestClassifier(
                n_estimators=60, min_samples_leaf=4, random_state=42, n_jobs=1
            ),
            {"estimator__classifier__max_depth": [3, 6]},
        ),
        "AdaBoost": (
            AdaBoostClassifier(n_estimators=60, algorithm="SAMME", random_state=42),
            {"estimator__classifier__learning_rate": [0.1, 0.5]},
        ),
        "Gradient boosting": (
            GradientBoostingClassifier(n_estimators=60, random_state=42),
            {"estimator__classifier__max_depth": [1, 2]},
        ),
        "Additive logistic": (
            LogisticRegression(max_iter=2000),
            {"estimator__classifier__C": [0.1, 1]},
        ),
    }
    result = {
        n: (calibrated(pipeline(e, spline=n == "Additive logistic")), g)
        for n, (e, g) in specs.items()
    }
    result["Calibrated OOF voting"] = (OOFVoting(), {})
    return result
