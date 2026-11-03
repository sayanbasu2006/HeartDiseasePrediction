"""These checks guard the UI-to-model boundary and the source's non-obvious recodings."""

from pathlib import Path
import json
import numpy as np
import pandas as pd
import pytest
from backend.ml.data import ROOT, load_data
from backend.schemas.clinical import Patient, FEATURES
from backend.schemas.labels import CATALOGUE, AUDIT, display_value


def test_catalogue_copies_match():
    frontend = ROOT.parent / "frontend/lib/fields.generated.json"
    assert json.loads(frontend.read_text()) == CATALOGUE


def test_source_mapping_audit():
    source = pd.read_csv(
        ROOT / "data/reference/processed.cleveland.data",
        header=None,
        names=FEATURES + ["diagnosis"],
        na_values="?",
    )
    local = pd.read_csv(ROOT / "data/heart.csv").reset_index(names="row")
    keys = ["age", "sex", "trestbps", "chol", "fbs", "thalach", "exang", "oldpeak"]
    matches = local.merge(
        source, on=keys, suffixes=("_local", "_uci"), how="left", indicator=True
    )
    assert matches.row.nunique() == 303 and (matches["_merge"] == "both").all()
    for key, mapping in AUDIT["mappings"].items():
        for raw, record in mapping.items():
            values = matches.loc[matches[key + "_local"] == int(raw), key + "_uci"]
            assert (
                values.isna().all()
                if record["uci_value"] is None
                else (values == record["uci_value"]).all()
            )
    assert (matches.loc[matches.target == 1, "diagnosis"] == 0).all()
    assert (matches.loc[matches.target == 0, "diagnosis"] > 0).all()


def test_nonstandard_recodings_are_preserved():
    assert display_value("cp", 3) == "Typical angina"
    assert display_value("cp", 0) == "No symptoms (asymptomatic)"
    assert display_value("restecg", 1) == "Normal ECG"
    assert display_value("slope", 2) == "Upward slope"
    assert display_value("thal", 1) == "Fixed blood-flow defect"
    assert display_value("thal", 2) == "Normal blood-flow result"


def test_labels_and_numeric_inputs_produce_identical_predictions(client, patient):
    labels = {
        **patient,
        "sex": "Male",
        "cp": "Typical angina",
        "fbs": "Yes",
        "restecg": "Possible heart-muscle enlargement (LVH)",
        "exang": "No",
        "slope": "Downward slope",
        "ca": "None",
        "thal": "Fixed defect",
    }
    first = client.post("/api/predict", json=patient)
    second = client.post("/api/predict", json=labels)
    assert first.status_code == second.status_code == 200
    a, b = first.json(), second.json()
    assert (
        a["measurements"] == b["measurements"] and a["model_score"] == b["model_score"]
    )
    assert a["class_description"] == "No-disease dataset pattern"
    assert a["score_label"] == "Disease-pattern model score"
    assert a["disease_class_score"] == 1 - a["no_disease_class_score"]
    assert a["no_disease_class_score"] == a["model_score"]
    assert "not your personal medical risk" in a["score_definition"]


@pytest.mark.parametrize("value", ["Female", "female", "F"])
def test_female_label_is_accepted(client, patient, value):
    r = client.post("/api/predict", json={**patient, "sex": value})
    assert r.status_code == 200 and r.json()["measurements"]["sex"] == 0


@pytest.mark.parametrize(
    "change",
    [
        {"sex": "Other / not listed"},
        {"sex": "Prefer not to say"},
        {"sex": -1},
        {"ca": 4},
        {"thal": 0},
        {"ca": "Not available"},
        {"thal": "Not available"},
    ],
)
def test_unsupported_or_missing_values_abstain(client, patient, change):
    response = client.post("/api/predict", json={**patient, **change})
    assert response.status_code == 422
    assert "Input should be 0, 1" not in response.text


def test_friendly_csv_template_round_trip(client, patient):
    header = client.get("/api/template").text
    assert "Sex" in header and "Chest pain type" in header
    r = client.post(
        "/api/upload/validate",
        files={
            "file": (
                "friendly.csv",
                header
                + "63,Male,Typical angina,145,233,Yes,Possible heart-muscle enlargement (LVH),150,No,2.3,Downward slope,None,Fixed defect\n",
            )
        },
    )
    assert r.status_code == 200
    data = r.json()
    mapped = {
        target: data["rows"][0][source]
        for source, target in data["suggested_mapping"].items()
        if target
    }
    assert set(mapped) == set(FEATURES)
    batch = client.post(
        "/api/predict/batch", json={"records": [mapped, {**mapped, "sex": "Other"}]}
    )
    assert batch.status_code == 200 and batch.json()["results"][0]["eligible"]
    assert (
        batch.json()["results"][0]["result"]["measurements"]
        == Patient.model_validate(patient).model_dump()
    )


def test_new_assessment_rejects_source_missing_markers_in_batch(client, patient):
    r = client.post(
        "/api/predict/batch",
        json={"records": [patient, {**patient, "ca": 4}, {**patient, "thal": 0}]},
    ).json()
    assert (
        r["eligible"] == 1
        and "missing measurement" in r["results"][1]["errors"][0]["message"]
    )


def test_field_info_has_readable_choices(client):
    fields = client.get("/api/field-info").json()["fields"]
    sex = next(f for f in fields if f["key"] == "sex")
    assert [o["label"] for o in sex["options"]][:2] == ["Male", "Female"]
