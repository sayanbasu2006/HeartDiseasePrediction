import pytest
import pandas as pd
from pydantic import ValidationError
from backend.ml.data import CLEVELAND_DATASET, load_data
from backend.schemas.clinical import Measurement
from backend.schemas.labels import AUDIT


def test_cleveland_csv_and_example_carry_generated_index_provenance(client):
    records = pd.read_csv(CLEVELAND_DATASET)
    assert len(records) == 303
    assert records.visceral_fat.between(1, 31).all()
    assert records.visceral_fat_source.eq("generated").all()
    observed, audit = load_data()
    assert "visceral_fat" not in observed
    assert audit["sha256"] == AUDIT["local_sha256"]

    example = client.get("/api/example").json()
    assert example["synthetic"] is False
    assert example["generated_fields"] == ["visceral_fat"]
    assert example["measurements"]["visceral_fat"] == records.visceral_fat.iloc[0]
    assert "generated" in example["notice"]


def test_visceral_fat_is_retained_without_changing_prediction(client, patient):
    baseline = client.post('/api/predict', json=patient).json()
    response = client.post('/api/predict', json={**patient, 'visceral_fat': 8.5})
    assert response.status_code == 200
    result = response.json()
    assert result['measurements']['visceral_fat'] == 8.5
    assert result['model_score'] == baseline['model_score']
    assert all(f['feature'] != 'visceral_fat' for f in result['explanation']['features'])


def test_visceral_fat_measurement():
    record = Measurement(timestamp='2026-11-06T10:00:00+05:30', visceral_fat=8)
    assert record.model_dump()['visceral_fat'] == 8
    for value in [-1, float('inf'), float('nan')]:
        with pytest.raises(ValidationError):
            Measurement(timestamp=record.timestamp, visceral_fat=value)


def test_visceral_fat_history_round_trip_and_trend(client):
    records = [
        {"timestamp": "2026-11-06T10:00:00+05:30", "visceral_fat": 0},
        {"timestamp": "2026-11-07T10:00:00+05:30", "heart_rate": 72},
        {"timestamp": "2026-11-08T10:00:00+05:30", "visceral_fat": 8.5},
    ]
    response = client.post(
        "/api/history/measurements",
        json={"consent": True, "measurements": records},
    )
    assert response.status_code == 200
    saved = client.get("/api/history/measurements").json()["measurements"]
    assert [row["visceral_fat"] for row in saved] == [0, None, 8.5]
    analysis = client.post("/api/history/analyze", json={}).json()
    trend = analysis["trends"]["visceral_fat"]
    assert [row["observed"] for row in trend] == [0, 8.5]
    assert trend[1]["time"] - trend[0]["time"] == 2 * 86400000
    assert not analysis["hmm"]["available"]


def test_visceral_fat_batch_optional_and_invalid_values(client, patient):
    values = [None, "", "0", "8.5", "-1", "nan", "inf", "invalid"]
    response = client.post(
        "/api/predict/batch",
        json={"records": [{**patient, "visceral_fat": v} for v in values]},
    )
    assert response.status_code == 200
    rows = response.json()["results"]
    assert [row["eligible"] for row in rows] == [True] * 4 + [False] * 4
    assert [row["result"]["measurements"]["visceral_fat"] for row in rows[:4]] == [
        None, None, 0, 8.5
    ]
    assert len({row["result"]["model_score"] for row in rows[:4]}) == 1


def test_visceral_fat_does_not_change_existing_temporal_analysis():
    from backend.ml.temporal import analyze

    records = [
        Measurement(timestamp="2026-11-06T10:00:00Z", heart_rate=70, systolic=110),
        Measurement(timestamp="2026-11-07T10:00:00Z", heart_rate=75, systolic=120),
    ]
    baseline = analyze(records)
    result = analyze([r.model_copy(update={"visceral_fat": 8 + i}) for i, r in enumerate(records)])
    assert result["hmm"] == baseline["hmm"]
    assert result["trends"].pop("visceral_fat")
    assert result == baseline
