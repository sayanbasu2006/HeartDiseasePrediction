import json
from io import BytesIO
from itertools import product
from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd
import pytest
from pypdf import PdfReader
from sklearn.base import clone
from backend.ml.data import load_data, ROOT
from backend.ml.models import candidates
from backend.schemas.clinical import FEATURES, Patient, Measurement
from backend.services.inference import artifacts
from backend.ml.temporal import forward_backward, viterbi, kalman, analyze


def test_source_audit_and_deduplication():
    df, a = load_data()
    assert a["raw_rows"] == 303 and len(df) == 302 and not df.duplicated().any()
    assert a["duplicates_removed"] == 1 and a["null_cells"] == 0
    assert list(df.columns) == FEATURES + ["target"]
    assert a["unusual_codes"] == {"ca=4": 5, "thal=0": 2}


def test_unexpected_schema_rejected(tmp_path):
    p = tmp_path / "bad.csv"
    pd.DataFrame({"age": [20], "target": [1]}).to_csv(p, index=False)
    with pytest.raises(ValueError):
        load_data(p)


def test_training_partition_isolation():
    m = json.loads((ROOT / "artifacts/metadata.json").read_text())
    split = m["split"]
    train = set(split["development_indices"])
    test = set(split["holdout_indices"])
    assert len(train) == 241 and len(test) == 61 and train.isdisjoint(test)
    seen = []
    for f in split["outer_folds"]:
        tr, va = set(f["train"]), set(f["validation"])
        assert tr.isdisjoint(va) and tr | va == train and (tr | va).isdisjoint(test)
        seen += f["validation"]
    assert len(seen) == len(set(seen)) == len(train)
    # Every preprocessor belongs to the estimator that nested CV clones, not a pre-fitted global transform.
    for name, (model, grid) in candidates().items():
        assert clone(model) is not model
        if hasattr(model, "estimator"):
            assert "preprocess" in model.estimator.named_steps and not hasattr(
                model.estimator.named_steps["preprocess"], "transformers_"
            )


def test_artifact_feature_consistency(patient):
    a, m = artifacts()
    assert a["features"] == m["features"] == FEATURES
    original = a["model"].predict_proba(pd.DataFrame([patient], columns=FEATURES))
    shuffled = a["model"].predict_proba(
        pd.DataFrame([dict(reversed(list(patient.items())))])
    )
    np.testing.assert_allclose(original, shuffled)


def test_predict_and_explanation(client, patient):
    response = client.post("/api/predict", json=patient)
    assert response.status_code == 200
    result = response.json()
    assert 0 <= result["model_score"] <= 1 and result["input_completeness"] == 1
    explanation = result["explanation"]
    assert (
        abs(
            sum(f["contribution"] for f in explanation["features"])
            + explanation["reference_score"]
            - result["disease_class_score"]
        )
        < 1e-8
    )
    assert client.get("/api/history/measurements").json()["measurements"] == []


@pytest.mark.parametrize(
    "change",
    [
        {"ca": 5},
        {"thal": 4},
        {"age": -1},
        {"fbs": 120},
        {"oldpeak": -1},
        {"sex": "unsupported value"},
        {"extra": "secret"},
    ],
)
def test_unsupported_inputs_abstain(client, patient, change):
    r = client.post("/api/predict", json={**patient, **change})
    assert r.status_code == 422
    assert (
        all("input" not in error for error in r.json()["detail"])
        and "secret" not in r.text
    )


@pytest.mark.parametrize("missing", FEATURES)
def test_missing_input_abstains(client, patient, missing):
    patient.pop(missing)
    assert client.post("/api/predict", json=patient).status_code == 422


def test_upload_mapping_and_batch(client, patient):
    r = client.post(
        "/api/upload/validate",
        files={
            "file": (
                "data.csv",
                "age,resting_bp,fasting_blood_sugar\n55,130,120\n",
                "text/csv",
            )
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["suggested_mapping"]["resting_bp"] == "trestbps"
    result = client.post(
        "/api/predict/batch", json={"records": [patient, {"age": 44}]}
    ).json()
    assert result["eligible"] == 1 and len(result["results"][1]["errors"]) == 12
    assert (
        client.post(
            "/api/upload/validate",
            files={"file": ("data.json", json.dumps(patient), "application/json")},
        ).status_code
        == 200
    )


@pytest.mark.parametrize(
    "name,content",
    [
        ("bad.csv", "age,age\n1,2"),
        ("bad.json", "{bad"),
        ("bad.csv", ""),
        ("bad.exe", "anything"),
    ],
)
def test_bad_uploads(client, name, content):
    assert (
        client.post("/api/upload/validate", files={"file": (name, content)}).status_code
        == 422
    )


def test_upload_limit(client):
    assert client.post(
        "/api/upload/validate",
        files={"file": ("large.csv", b"a" * (2 * 1024 * 1024 + 1))},
    ).status_code in [413, 422]


def test_consent_ordering_and_delete(client):
    records = [
        {"timestamp": "2026-01-02T12:00:00Z", "heart_rate": 70},
        {"timestamp": "2026-01-01T15:00:00+05:30", "systolic": 120, "diastolic": 80},
    ]
    assert (
        client.post(
            "/api/history/measurements", json={"measurements": records}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/history/measurements", json={"consent": True, "measurements": records}
        ).status_code
        == 200
    )
    saved = client.get("/api/history/measurements").json()["measurements"]
    assert saved[0]["systolic"] == 120
    assert (
        client.delete("/api/history/measurements").status_code == 200
        and not client.get("/api/history/measurements").json()["measurements"]
    )


def test_missing_timezone_and_reversed_pressure(client):
    for record in [
        {"timestamp": "2026-01-01T12:00:00", "heart_rate": 80},
        {"timestamp": "2026-01-01T12:00:00Z", "systolic": 80, "diastolic": 100},
    ]:
        assert (
            client.post(
                "/api/history/measurements",
                json={"consent": True, "measurements": [record]},
            ).status_code
            == 422
        )


def test_hmm_against_bruteforce():
    start = np.array([0.6, 0.4])
    transition = np.array([[0.7, 0.3], [0.4, 0.6]])
    emission = np.array([[0.5, 0.1], [0.4, 0.3], [0.1, 0.6]])
    ll, posterior = forward_backward(np.log(emission), start, transition)
    paths = list(product(range(2), repeat=3))
    weights = [
        start[s[0]]
        * emission[0, s[0]]
        * transition[s[0], s[1]]
        * emission[1, s[1]]
        * transition[s[1], s[2]]
        * emission[2, s[2]]
        for s in paths
    ]
    assert np.isclose(np.exp(ll), sum(weights))
    np.testing.assert_allclose(posterior.sum(axis=1), 1)
    expected = np.array(
        [
            sum(w for s, w in zip(paths, weights) if s[t] == k) / sum(weights)
            for t in range(3)
            for k in range(2)
        ]
    ).reshape(3, 2)
    np.testing.assert_allclose(posterior, expected)
    assert (
        tuple(viterbi(np.log(emission), start, transition)) == paths[np.argmax(weights)]
    )


def test_hmm_log_domain_and_insufficient():
    ll, p = forward_backward(
        np.full((1000, 2), -1000.0),
        np.array([0.5, 0.5]),
        np.array([[0.8, 0.2], [0.2, 0.8]]),
    )
    assert np.isfinite(ll)
    np.testing.assert_allclose(p.sum(axis=1), 1, atol=1e-6)
    assert not analyze([])["hmm"]["available"]


def test_temporal_demo_is_separate(client):
    r = client.post("/api/history/analyze", json={"demo": True})
    assert r.status_code == 200
    a = r.json()
    assert a["synthetic_demo"] and a["count"] == 60 and a["hmm"]["available"]
    assert not client.get("/api/history/measurements").json()["measurements"]


def test_irregular_temporal_rejected():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = [
        Measurement(
            timestamp=start + timedelta(days=i * i),
            heart_rate=65 + i % 5,
            systolic=120 + i % 6,
        )
        for i in range(30)
    ]
    assert not analyze(rows)["hmm"]["available"]


def test_kalman_time_and_variability():
    rng = np.random.default_rng(5)
    v = 70 + rng.normal(0, 5, 60)
    times = [
        datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=i) for i in range(60)
    ]
    r = kalman(v, times)
    assert np.var([x["filtered"] for x in r]) < np.var(v) and all(
        x["estimate_sd"] > 0 for x in r
    )
    spaced = [times[0], times[0] + timedelta(days=100)]
    near = [times[0], times[0] + timedelta(hours=1)]
    assert (
        kalman([70, 100], spaced)[1]["filtered"]
        > kalman([70, 100], near)[1]["filtered"]
    )


def test_report_pdf(client, patient):
    r = client.post("/api/report", json=patient)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    pdf = PdfReader(BytesIO(r.content))
    text = "".join(p.extract_text() for p in pdf.pages)
    assert (
        "NOT A MEDICAL DIAGNOSIS" in text
        and "ST depression" in text
        and "Version" in text
    )
    assert len(pdf.pages) <= 3


def test_offline_model_response(client, monkeypatch):
    import backend.api.main as main

    def missing(*args, **kwargs):
        raise RuntimeError("Model not trained.")

    monkeypatch.setattr(main, "artifacts", missing)
    assert client.get("/api/metrics").status_code == 503


def test_origin_guard(client):
    assert (
        client.post(
            "/api/history/measurements",
            json={"consent": True, "measurements": []},
            headers={"Origin": "https://untrusted.example"},
        ).status_code
        == 403
    )


def test_demo_report_identification(client, patient):
    response = client.post("/api/report", json={**patient, "demonstration": True})
    text = "".join(p.extract_text() for p in PdfReader(BytesIO(response.content)).pages)
    assert "DATASET DEMONSTRATION" in text and "NOT A PERSONAL HEALTH RECORD" in text


@pytest.mark.parametrize(
    "content", ['{"age":NaN}', '{"age":Infinity}', '{"age":{"nested":"value"}}']
)
def test_nonscalar_nonfinite_upload_rejected(client, content):
    assert (
        client.post(
            "/api/upload/validate", files={"file": ("bad.json", content)}
        ).status_code
        == 422
    )
