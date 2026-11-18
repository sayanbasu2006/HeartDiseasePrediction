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
    training, audit = load_data()
    assert "visceral_fat" in training
    assert audit["observed_sha256"] == AUDIT["local_sha256"]

    example = client.get("/api/example").json()
    assert example["synthetic"] is False
    assert example["generated_fields"] == ["visceral_fat"]
    assert example["measurements"]["visceral_fat"] == records.visceral_fat.iloc[0]
    assert "generated" in example["notice"]


def test_visceral_fat_changes_prediction_and_is_explained(client, patient):
    baseline = client.post('/api/predict', json=patient).json()
    response = client.post('/api/predict', json={**patient, 'visceral_fat': 8.5})
    assert response.status_code == 200
    result = response.json()
    assert result['measurements']['visceral_fat'] == 8.5
    assert result['model_score'] != baseline['model_score']
    assert any(f['feature'] == 'visceral_fat' for f in result['explanation']['features'])


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


def test_visceral_fat_batch_requires_finite_recorded_values(client, patient):
    values = [None, "", "0", "8.5", "-1", "nan", "inf", "invalid"]
    response = client.post(
        "/api/predict/batch",
        json={"records": [{**patient, "visceral_fat": v} for v in values]},
    )
    assert response.status_code == 200
    rows = response.json()["results"]
    assert [row["eligible"] for row in rows] == [False, False, True, True] + [False] * 4
    assert [row["result"]["measurements"]["visceral_fat"] for row in rows[2:4]] == [
        0, 8.5
    ]
    assert len({row["result"]["model_score"] for row in rows[2:4]}) == 2


def test_visceral_fat_cannot_be_omitted_from_assessment_or_report(client, patient):
    patient.pop("visceral_fat")
    for path in ("/api/predict", "/api/explain", "/api/report"):
        response = client.post(path, json=patient)
        assert response.status_code == 422
        assert any(error["loc"][-1] == "visceral_fat" for error in response.json()["detail"])
    batch = client.post("/api/predict/batch", json={"records": [patient]}).json()
    assert batch["eligible"] == 0
    assert batch["results"][0]["errors"][0]["field"] == "visceral_fat"


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


@pytest.mark.parametrize("synthetic", [False, True])
def test_fat_effect_is_a_same_record_model_comparison(client, patient, synthetic):
    path = "/api/synthetic/predict" if synthetic else "/api/predict"
    if synthetic:
        patient = client.get("/api/synthetic/example").json()["measurements"]
    result = client.post(path, json=patient).json()
    effect = result["visceral_fat_effect"]
    assert effect["index"] == patient["visceral_fat"]
    assert effect["submitted_score"] == result["disease_class_score"]
    reference = client.post(
        f"{path}?explain=false",
        json={**patient, "visceral_fat": effect["reference_index"]},
    ).json()
    assert effect["reference_score"] == pytest.approx(reference["disease_class_score"])
    assert effect["difference"] == pytest.approx(
        result["disease_class_score"] - reference["disease_class_score"]
    )
    assert reference["visceral_fat_effect"]["difference"] == pytest.approx(0)
    assert reference["visceral_fat_effect"]["curve"] == []
    assert effect["reference_count"] > 0
    assert "generated" in effect["method"]
    assert "not a clinical target" in effect["method"]
    indices = [point["index"] for point in effect["curve"]]
    assert indices == sorted(set(indices))
    assert effect["index"] in indices and effect["reference_index"] in indices
    for point in effect["curve"][::3]:
        actual = client.post(
            f"{path}?explain=false",
            json={**patient, "visceral_fat": point["index"]},
        ).json()
        assert point["score"] == pytest.approx(actual["disease_class_score"])


def test_batch_includes_fat_effect_without_full_explanation(client, patient):
    response = client.post("/api/predict/batch", json={"records": [patient]}).json()
    result = response["results"][0]["result"]
    assert result["explanation"] is None
    assert result["visceral_fat_effect"]["index"] == patient["visceral_fat"]
    assert result["visceral_fat_effect"]["curve"] == []
    individual = client.post("/api/predict?explain=false", json=patient).json()
    assert result["visceral_fat_effect"] == individual["visceral_fat_effect"]


def test_fat_effect_pdf_has_a_dedicated_visual_page(client, patient):
    from io import BytesIO
    from pypdf import PdfReader

    response = client.post("/api/report", json=patient)
    pages = PdfReader(BytesIO(response.content)).pages
    assert len(pages) == 3
    text = " ".join(pages[2].extract_text().split())
    assert "Visceral fat, in focus" in text
    assert "percentage points" in text
    assert "generated" in text
    assert "not a recommended or healthy index" in text
