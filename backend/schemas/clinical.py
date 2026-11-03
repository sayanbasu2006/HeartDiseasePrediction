"""Numeric model contract with source-verified plain-language input aliases."""

from backend.schemas.labels import decode_choice, FIELDS

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

FEATURES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]
CONTINUOUS = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CATEGORIES = {
    "sex": [0, 1],
    "cp": [0, 1, 2, 3],
    "fbs": [0, 1],
    "restecg": [0, 1, 2],
    "exang": [0, 1],
    "slope": [0, 1, 2],
    "ca": [0, 1, 2, 3, 4],
    "thal": [0, 1, 2, 3],
}
BOUNDS = {
    "age": (18, 100),
    "trestbps": (70, 250),
    "chol": (80, 650),
    "thalach": (40, 230),
    "oldpeak": (0, 10),
}
DISCLAIMER = "Experimental research only. This prediction cannot confirm or exclude heart disease. The score is not a clinically validated future cardiovascular event probability."


class Patient(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    age: int = Field(ge=18, le=100)
    sex: Literal[0, 1]
    cp: Literal[0, 1, 2, 3]
    trestbps: float = Field(ge=70, le=250)
    chol: float = Field(ge=80, le=650)
    fbs: Literal[0, 1]
    restecg: Literal[0, 1, 2]
    thalach: float = Field(ge=40, le=230)
    exang: Literal[0, 1]
    oldpeak: float = Field(ge=0, le=10)
    slope: Literal[0, 1, 2]
    ca: Literal[0, 1, 2, 3, 4]
    thal: Literal[0, 1, 2, 3]

    @model_validator(mode="before")
    @classmethod
    def decode_labels(cls, data):
        if isinstance(data, dict):
            return {key: decode_choice(key, value) for key, value in data.items()}
        return data

    @field_validator("ca", "thal")
    @classmethod
    def require_recorded_tests(cls, value, info):
        if (info.field_name == "ca" and value == 4) or (
            info.field_name == "thal" and value == 0
        ):
            raise ValueError(FIELDS[info.field_name]["validationMessage"])
        return value


class ReportRequest(Patient):
    demonstration: bool = False


class Batch(BaseModel):
    records: list[dict] = Field(min_length=1, max_length=1000)


class Measurement(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    timestamp: datetime
    heart_rate: float | None = Field(default=None, ge=25, le=250)
    systolic: float | None = Field(default=None, ge=60, le=260)
    diastolic: float | None = Field(default=None, ge=30, le=160)
    cholesterol: float | None = Field(default=None, ge=50, le=700)

    @model_validator(mode="after")
    def check(self):
        if self.timestamp.tzinfo is None:
            raise ValueError("Timestamp must include a time zone.")
        if all(
            getattr(self, k) is None
            for k in ["heart_rate", "systolic", "diastolic", "cholesterol"]
        ):
            raise ValueError("Provide at least one measurement.")
        if self.systolic and self.diastolic and self.systolic <= self.diastolic:
            raise ValueError("Systolic must exceed diastolic.")
        return self


class HistoryInput(BaseModel):
    consent: bool = False
    measurements: list[Measurement] = Field(min_length=1, max_length=1000)


class AnalysisInput(BaseModel):
    measurements: list[Measurement] = Field(default_factory=list, max_length=1000)
    demo: bool = False


class FeatureContribution(BaseModel):
    feature: str
    value: float
    contribution: float


class ExplanationOutput(BaseModel):
    method: str
    reference_score: float
    features: list[FeatureContribution]


class PredictionOutput(BaseModel):
    timestamp: datetime
    predicted_class: Literal[0, 1]
    label: str
    class_description: str
    model_score: float = Field(ge=0, le=1)
    no_disease_class_score: float = Field(ge=0, le=1)
    disease_class_score: float = Field(ge=0, le=1)
    score_label: str
    score_definition: str
    calibration_adequate: bool
    model_version: str
    model_name: str
    input_completeness: Literal[1.0]
    measurements: Patient
    limitations: list[str]
    explanation: ExplanationOutput | None


class FieldIssue(BaseModel):
    field: str
    message: str


class BatchRecordOutput(BaseModel):
    row: int
    eligible: bool
    errors: list[FieldIssue]
    result: PredictionOutput | None


class BatchOutput(BaseModel):
    results: list[BatchRecordOutput]
    total: int
    eligible: int


class UploadOutput(BaseModel):
    columns: list[str]
    suggested_mapping: dict[str, str]
    rows: list[dict]
    row_count: int
    notice: str
