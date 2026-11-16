"""Compare recorded CAD models on the Ankara cohort without changing runtime artifacts."""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ANKARA_SOURCE = "UCI Gallstone/Ankara clinical study"
FAT = "visceral_fat_device_rating_index"
BASE_FEATURES = ["age_years", "sex_male_1_female_0", "bmi"]
CAD = "coronary_artery_disease_binary_label"
UCI_OUTCOME = "heart_disease_uci_binary_label"
SEX_SOURCE = "gender_original_0male_1female"
CAD_SOURCE = "coronary_artery_disease_0no_1yes"


def load_cohort(research_csv, visceral_fat_csv):
    combined = pd.read_csv(research_csv)
    ankara = pd.read_csv(visceral_fat_csv)
    ids = ankara["source_record_id"]
    if not ids.is_unique or ids.isna().any():
        raise ValueError("Ankara records need distinct, nonempty source IDs.")
    if not ankara[[SEX_SOURCE, CAD_SOURCE]].isin([0, 1]).all().all():
        raise ValueError("The Ankara sex and CAD columns must contain binary source codes.")

    ankara = ankara.assign(
        sex_male_1_female_0=1 - ankara[SEX_SOURCE],
        coronary_artery_disease_binary_label=ankara[CAD_SOURCE],
    )
    comparison = [*BASE_FEATURES, FAT, CAD]
    cohort = ankara[comparison]
    if not np.isfinite(cohort.to_numpy(dtype=float)).all() or (cohort[FAT] < 0).any():
        raise ValueError("The experiment requires finite inputs and a nonnegative device index.")

    combined_ankara = combined.loc[combined.source_dataset.eq(ANKARA_SOURCE), comparison]
    try:
        pd.testing.assert_frame_equal(
            combined_ankara.sort_values(comparison).reset_index(drop=True),
            cohort.sort_values(comparison).reset_index(drop=True),
            check_dtype=False,
            check_exact=True,
        )
    except AssertionError as exc:
        raise ValueError("The two CSVs disagree on the Ankara measurements or CAD labels.") from exc

    audit = {
        "combined_records": len(combined),
        "uci_outcomes": int(combined[UCI_OUTCOME].notna().sum()),
        "same_row_uci_outcome_and_visceral_fat": int(
            combined[[UCI_OUTCOME, FAT]].notna().all(axis=1).sum()
        ),
        "ankara_records": len(cohort),
        "ankara_cad_positive": int(cohort[CAD].sum()),
    }
    return cohort, audit


def scores(y, probability):
    prediction = probability >= 0.5
    tn, fp, fn, tp = confusion_matrix(y, prediction, labels=[0, 1]).ravel()
    return {
        "accuracy": accuracy_score(y, prediction),
        "balanced_accuracy": balanced_accuracy_score(y, prediction),
        "roc_auc": roc_auc_score(y, probability),
        "average_precision": average_precision_score(y, probability),
        "true_negative": int(tn),
        "false_positive": int(fp),
        "false_negative": int(fn),
        "true_positive": int(tp),
    }


def evaluate(research_csv, visceral_fat_csv):
    cohort, audit = load_cohort(research_csv, visceral_fat_csv)
    y = cohort[CAD]
    # Keep identical baseline inputs together in both comparisons.
    groups = cohort.groupby(BASE_FEATURES).ngroup()
    split = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=42)
    folds = list(split.split(cohort, y, groups))
    if any(
        y.iloc[held_out].nunique() != 2 or y.iloc[train].nunique() != 2
        for train, held_out in folds
    ):
        raise ValueError("Each fold needs both CAD classes in its training and test partitions.")

    estimator = make_pipeline(
        StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=2000)
    )
    results = {}
    for name, features in (
        ("without_visceral_fat", BASE_FEATURES),
        ("with_visceral_fat", [*BASE_FEATURES, FAT]),
    ):
        probabilities = cross_val_predict(
            estimator, cohort[features], y, cv=folds, method="predict_proba"
        )[:, 1]
        results[name] = scores(y, probabilities)

    return {
        "audit": audit,
        "outcome": "Documented CAD comorbidity in the Ankara gallstone study",
        "held_out_cad_counts": [int(y.iloc[held_out].sum()) for _, held_out in folds],
        "majority_class": scores(y, np.zeros(len(y))),
        **results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("research_csv", type=Path)
    parser.add_argument("visceral_fat_csv", type=Path)
    args = parser.parse_args()
    print(json.dumps(evaluate(args.research_csv, args.visceral_fat_csv), indent=2))
