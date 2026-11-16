from hashlib import sha256
from io import BytesIO

import pandas as pd
import pytest
from pypdf import PdfReader

from backend.ml.data import SYNTHETIC_DATASET
from backend.ml.train_synthetic import evaluate
from backend.schemas.clinical import SYNTHETIC_FEATURES
from backend.services.inference import synthetic_artifact


def test_shipped_synthetic_model_matches_held_out_data():
    artifact = synthetic_artifact()
    metadata = artifact["metadata"]
    assert sha256(SYNTHETIC_DATASET.read_bytes()).hexdigest() == metadata["dataset_sha256"]
    records = pd.read_csv(SYNTHETIC_DATASET)
    development = records.loc[records.split.eq("training")]
    holdout = records.loc[records.split.eq("holdout")]
    assert records.record_id.is_unique
    assert development.merge(holdout, on=SYNTHETIC_FEATURES).empty
    assert set(artifact["background"].index) <= set(development.index)
    assert len(holdout) == metadata["metrics"]["holdout_rows"]
    metrics = evaluate(artifact["model"], holdout, SYNTHETIC_FEATURES)
    assert metrics["accuracy"] > 0.85
    assert metrics["accuracy"] == metadata["metrics"]["with_visceral_fat"]["accuracy"]


def test_synthetic_score_and_explanation_respond_to_visceral_fat(client):
    example = client.get("/api/synthetic/example").json()
    assert example["synthetic"] is True
    inputs = example["measurements"]
    low = client.post("/api/synthetic/predict", json={**inputs, "visceral_fat": 4})
    high = client.post("/api/synthetic/predict", json={**inputs, "visceral_fat": 28})
    assert low.status_code == high.status_code == 200
    low, high = low.json(), high.json()
    assert high["synthetic"] is True
    assert high["holdout_accuracy"] > 0.85
    assert low["disease_class_score"] < high["disease_class_score"]
    explanation = high["explanation"]
    assert {item["feature"] for item in explanation["features"]} == set(SYNTHETIC_FEATURES)
    assert explanation["reference_score"] + sum(
        item["contribution"] for item in explanation["features"]
    ) == pytest.approx(high["disease_class_score"])


@pytest.mark.parametrize("index", [None, 0, 32])
def test_synthetic_index_validation_keeps_default_prediction_contract(client, patient, index):
    measurements = {**patient, "visceral_fat": index}
    assert client.post("/api/synthetic/predict", json=measurements).status_code == 422
    response = client.post("/api/predict", json=measurements)
    assert response.status_code == 200
    assert "synthetic" not in response.json()


def test_synthetic_pdf_identifies_source_and_index(client):
    measurements = client.get("/api/synthetic/example").json()["measurements"]
    response = client.post("/api/synthetic/report", json=measurements)
    assert response.status_code == 200
    text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)
    assert "MODEL DEMONSTRATION | SIMULATED DATA" in text
    assert "Holdout accuracy: 94.25% on 800 generated records" in text
    assert "Visceral fat (simulated device index)" in text
