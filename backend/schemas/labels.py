"""Verified display labels, kept separate from the trained numeric feature contract."""

import json
from pathlib import Path

CATALOGUE = json.loads((Path(__file__).parent / "fields.json").read_text())
FIELDS = {f["key"]: f for f in CATALOGUE["fields"]}
AUDIT = json.loads(
    (Path(__file__).parents[1] / "data/category_mapping_audit.json").read_text()
)


def decode_choice(field, value):
    if not isinstance(value, str) or not FIELDS.get(field, {}).get("options"):
        return value
    text = value.strip().casefold()
    for item in FIELDS[field]["options"]:
        if text in [
            str(item["label"]).casefold(),
            *[str(s).casefold() for s in item["aliases"]],
        ]:
            return item["value"]
    try:
        number = float(text)
        if number.is_integer():
            return int(number)
    except ValueError:
        pass
    return value


def field_label(field):
    return FIELDS.get(field, {}).get("label", field)


def display_value(field, value):
    for item in FIELDS.get(field, {}).get("options", []):
        if value == item["value"]:
            return item["label"]
    return str(value)


def supported_value(field, value):
    options = FIELDS.get(field, {}).get("options", [])
    return (
        any(o["value"] == value and o["supported"] for o in options)
        if options
        else True
    )


def validation_message(field, message, error_type):
    metadata = FIELDS.get(field, {})
    if error_type == "literal_error" and metadata.get("options"):
        return (
            metadata.get("validationMessage")
            or "Choose a recorded result: "
            + ", ".join(o["label"] for o in metadata["options"] if o["supported"])
            + "."
        )
    return message
