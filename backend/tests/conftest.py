import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
# SQLite StaticPool is installed on the storage engine before TestClient opens threads.
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from backend.database import store

store.engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
store.Base.metadata.create_all(store.engine)


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from backend.api.main import app

    store.clear()
    with TestClient(app) as c:
        yield c
    store.clear()


@pytest.fixture
def patient():
    from backend.ml.data import load_data
    from backend.schemas.clinical import FEATURES

    df, _ = load_data()
    return df.iloc[0][FEATURES].to_dict()
