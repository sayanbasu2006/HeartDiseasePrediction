"""Add reproducible example device indices to the UCI Heart Disease CSV."""

from random import Random

from backend.ml.data import (
    MAIN_DATASET,
    GENERATED_FAT_SUFFIX,
    load_data,
    observed_csv_bytes,
    write_atomically,
)
from backend.schemas.clinical import SYNTHETIC_INDEX_MIN, SYNTHETIC_INDEX_MAX

SEED = 20261117


def add_reference_indices(path=MAIN_DATASET):
    header, *rows = observed_csv_bytes(path).splitlines(keepends=True)
    header_fields = header.rstrip(b"\r\n")
    enriched = [header_fields + GENERATED_FAT_SUFFIX + header[len(header_fields):]]
    rng = Random(SEED)
    indices = {}
    for line in rows:
        row = line.rstrip(b"\r\n")
        if row not in indices:
            indices[row] = rng.randint(SYNTHETIC_INDEX_MIN, SYNTHETIC_INDEX_MAX)
        suffix = f",{indices[row]},generated".encode("ascii")
        enriched.append(row + suffix + line[len(row):])
    write_atomically(path, lambda temporary: temporary.write_bytes(b"".join(enriched)))
    load_data(path)


if __name__ == "__main__":
    add_reference_indices()
