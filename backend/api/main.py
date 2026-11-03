import json, os, logging
import csv, io
import secrets
from datetime import datetime, timedelta, timezone
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import Response, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from backend.ml.data import ROOT
from backend.schemas.clinical import (
    Patient,
    ReportRequest,
    Batch,
    Measurement,
    HistoryInput,
    AnalysisInput,
    FEATURES,
    PredictionOutput,
    ExplanationOutput,
    BatchOutput,
    UploadOutput,
)
from backend.services.inference import artifacts, predict
from backend.services.uploads import parse, errors, normalize, MAX_BYTES
from backend.services.reports import make_report
from backend.ml.temporal import analyze
from backend.database import store
from backend.schemas.labels import CATALOGUE, FIELDS, AUDIT, validation_message

app = FastAPI(title="CardioLens AI", version="1.0.0")
origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def limits(request: Request, call_next):
    token = os.environ.get("CARDIOLENS_API_TOKEN")
    if (
        token
        and request.url.path != "/api/health"
        and not secrets.compare_digest(
            request.headers.get("authorization", ""), f"Bearer {token}"
        )
    ):
        return JSONResponse(
            {"detail": "Private API access is required."}, status_code=401
        )

    if request.method in {"POST", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin not in origins:
            return JSONResponse({"detail": "Origin not permitted."}, status_code=403)
        try:
            size = int(request.headers.get("content-length", 0))
        except ValueError:
            return JSONResponse({"detail": "Invalid content length."}, status_code=400)
        if size > MAX_BYTES + 65536:
            return JSONResponse(
                {"detail": "Request exceeds size limit."}, status_code=413
            )
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_BYTES + 65536:
                return JSONResponse(
                    {"detail": "Request exceeds size limit."}, status_code=413
                )
        request._body = bytes(body)
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def invalid(request, exc):
    return JSONResponse(
        {
            "detail": [
                {
                    "loc": e["loc"],
                    "msg": validation_message(
                        str(e["loc"][-1]) if e["loc"] else "", e["msg"], e["type"]
                    ),
                    "type": e["type"],
                }
                for e in exc.errors()
            ]
        },
        status_code=422,
    )


@app.exception_handler(RuntimeError)
async def unavailable(request, exc):
    return JSONResponse({"detail": str(exc)}, status_code=503)


@app.get("/api/health")
def health():
    return {"status": "ok", "model_ready": (ROOT / "artifacts/metadata.json").exists()}


@app.get("/api/model-info")
def model_info():
    _, m = artifacts()
    return {
        **{k: v for k, v in m.items() if k != "split"},
        "dataset": {
            **m["dataset"],
            "provenance": "User-supplied CSV matched to the primary UCI Cleveland reference. Category and outcome mappings are verified in a separate audit; no external clinical validation is supplied.",
        },
        "category_mapping": AUDIT,
        "target_interpretation": AUDIT["target_meanings"],
    }


@app.get("/api/metrics")
def metrics():
    artifacts()
    return json.loads((ROOT / "artifacts/metrics.json").read_text())


@app.get("/api/distributions")
def distributions():
    artifacts()
    return json.loads((ROOT / "artifacts/distributions.json").read_text())


@app.post("/api/predict", response_model=PredictionOutput)
def prediction(patient: Patient):
    return predict(patient)


@app.post("/api/explain", response_model=ExplanationOutput)
def explanation(patient: Patient):
    return predict(patient)["explanation"]


@app.post("/api/predict/batch", response_model=BatchOutput)
def batch(payload: Batch):
    result = []
    for i, row in enumerate(payload.records):
        issues = errors(row)
        result.append(
            {
                "row": i + 1,
                "eligible": not issues,
                "errors": issues,
                "result": (
                    None
                    if issues
                    else predict(Patient.model_validate(normalize(row)), False)
                ),
            }
        )
    return {
        "results": result,
        "total": len(result),
        "eligible": sum(r["eligible"] for r in result),
    }


@app.post("/api/upload/validate", response_model=UploadOutput)
async def upload(file: UploadFile = File(...)):
    try:
        return parse(await file.read(MAX_BYTES + 1), file.filename or "")
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/api/template")
def template():
    buffer = io.StringIO()
    csv.writer(buffer).writerow([FIELDS[f]["label"] for f in FEATURES])
    return Response(
        buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cardiolens-template.csv"},
    )


@app.post("/api/history/measurements")
def history_create(payload: HistoryInput):
    if not payload.consent:
        raise HTTPException(422, "Explicit storage consent is required.")
    store.save(payload.measurements)
    return {"saved": len(payload.measurements)}


@app.get("/api/history/measurements")
def history_read():
    return {"measurements": store.read()}


@app.delete("/api/history/measurements")
def history_delete():
    store.clear()
    return {"deleted": True}


@app.post("/api/history/analyze")
def history_analyze(payload: AnalysisInput):
    if payload.demo:
        rng = np.random.default_rng(7)
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        measurements = [
            Measurement(
                timestamp=start + timedelta(days=i),
                heart_rate=float(68 + (i // 15 % 2) * 13 + rng.normal(0, 2)),
                systolic=float(113 + (i // 15 % 2) * 15 + rng.normal(0, 3)),
                diastolic=float(73 + rng.normal(0, 3)),
                cholesterol=float(185 + rng.normal(0, 5)),
            )
            for i in range(60)
        ]
    else:
        measurements = payload.measurements or [
            Measurement.model_validate({k: v for k, v in r.items() if k != "id"})
            for r in store.read()
        ]
    return {**analyze(measurements), "synthetic_demo": payload.demo}


@app.post("/api/report")
def report(patient: ReportRequest):
    result = predict(
        Patient.model_validate(patient.model_dump(exclude={"demonstration"}))
    )
    result["demonstration"] = patient.demonstration
    return Response(
        make_report(result),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=cardiolens-assessment.pdf"
        },
    )


@app.get("/api/example")
def example():
    import pandas as pd

    row = pd.read_csv(ROOT / "data/heart.csv").iloc[0]
    return {
        "measurements": {f: float(row[f]) for f in FEATURES},
        "synthetic": False,
        "demonstration_only": True,
        "notice": "An actual dataset example, not a personal assessment; overlaps training data and cannot demonstrate generalization.",
    }


@app.get("/api/global-importance")
def global_importance():
    a, _ = artifacts()
    bg = a["background"]
    base = a["model"].predict_proba(bg)[:, 1]
    values = []
    for f in FEATURES:
        changed = bg.copy()
        changed[f] = np.roll(changed[f].to_numpy(), 1)
        delta = np.abs(a["model"].predict_proba(changed)[:, 1] - base)
        values.append({"feature": f, "contribution": float(delta.mean())})
    return {
        "features": sorted(values, key=lambda r: r["contribution"], reverse=True),
        "method": "Global descriptive sensitivity: mean absolute score change after cyclic feature permutation on 20 development reference rows. Not validation importance, not causal, and not an individual explanation.",
    }


@app.get("/api/field-info")
def field_info():
    return CATALOGUE
