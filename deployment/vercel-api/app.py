"""Hosted, stateless entry point for the CardioLens research demo."""

import os

os.environ["CARDIOLENS_PUBLIC_DEMO"] = "1"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

from backend.api.main import app
