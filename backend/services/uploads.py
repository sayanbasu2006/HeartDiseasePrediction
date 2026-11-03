import csv, io, json, math
from pydantic import ValidationError
from backend.schemas.clinical import Patient, Measurement, FEATURES, CATEGORIES
from backend.schemas.labels import decode_choice, FIELDS, validation_message

MAX_BYTES = 2 * 1024 * 1024
ALIASES = {
    "resting_bp": "trestbps",
    "resting_blood_pressure": "trestbps",
    "cholesterol": "chol",
    "max_heart_rate": "thalach",
    "st_depression": "oldpeak",
    "fasting_blood_sugar": "fbs",
    "date": "timestamp",
    "datetime": "timestamp",
    "pulse": "heart_rate",
    "sbp": "systolic",
    "dbp": "diastolic",
}


def parse(raw, filename):
    if len(raw) > MAX_BYTES:
        raise ValueError("Upload exceeds the 2 MB limit.")
    try:
        text = raw.decode("utf-8-sig")
        if filename.lower().endswith(".json"):
            data = json.loads(
                text,
                parse_constant=lambda value: (_ for _ in ()).throw(
                    ValueError("Non-finite JSON values are unsupported.")
                ),
            )
            if isinstance(data, dict):
                data = data.get("records", [data])
            if not isinstance(data, list):
                raise ValueError("JSON must contain an object or array of objects.")
            rows = data
        elif filename.lower().endswith(".csv"):
            reader = csv.DictReader(io.StringIO(text))
            if reader.fieldnames and len(set(reader.fieldnames)) != len(
                reader.fieldnames
            ):
                raise ValueError("Duplicate column names are unsupported.")
            rows = list(reader)
        else:
            raise ValueError("Use UTF-8 CSV or JSON.")
    except (UnicodeError, json.JSONDecodeError, csv.Error) as e:
        raise ValueError("Could not parse file as UTF-8 CSV or JSON.") from e
    if not rows or len(rows) > 1000 or not all(isinstance(r, dict) for r in rows):
        raise ValueError("Provide 1–1000 object records.")
    if any(
        isinstance(v, (list, dict)) or len(str(v)) > 1000
        for r in rows
        for v in r.values()
    ):
        raise ValueError("Cells must contain scalar values of at most 1000 characters.")
    columns = list(dict.fromkeys(str(k) for r in rows for k in r))
    if len(columns) > 60:
        raise ValueError("Too many columns (maximum 60).")
    ALIASES.update({f["label"].lower(): f["key"] for f in FIELDS.values()})
    suggestions = {
        c: (
            c.lower().strip()
            if c.lower().strip()
            in FEATURES + ["timestamp", "heart_rate", "systolic", "diastolic"]
            else ALIASES.get(c.lower().strip(), "")
        )
        for c in columns
    }
    return {
        "columns": columns,
        "suggested_mapping": suggestions,
        "rows": rows,
        "row_count": len(rows),
        "notice": "Review the columns and units. Category values may use plain-language labels, such as Male, Female, Yes and No. Missing tests cannot be inferred from monitoring readings.",
    }


def normalize(row):
    result = {}
    for key, value in row.items():
        if value is None or value == "":
            result[key] = None
        elif key in CATEGORIES:
            result[key] = decode_choice(key, value)
        elif isinstance(value, str) and key != "timestamp":
            result[key] = float(value)
        else:
            result[key] = value
    return result


def errors(row, model=Patient):
    try:
        model.model_validate(normalize(row))
        return []
    except (ValidationError, ValueError, TypeError) as e:
        if isinstance(e, ValidationError):
            return [
                {
                    "field": ".".join(map(str, x["loc"])),
                    "message": validation_message(
                        str(x["loc"][-1]) if x["loc"] else "", x["msg"], x["type"]
                    ),
                }
                for x in e.errors()
            ]
        return [{"field": "record", "message": "A numeric field could not be parsed."}]
