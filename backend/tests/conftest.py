import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
# Use a single in-memory SQLite connection across the app's worker threads.
import httpx
import pytest
from anyio.from_thread import start_blocking_portal
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from backend.database import store

store.engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
store.Base.metadata.create_all(store.engine)


class SyncASGITransport(httpx.BaseTransport):
    """Run HTTPX's ASGI transport on the app's event loop for synchronous tests."""

    def __init__(self, app, portal):
        self.transport = httpx.ASGITransport(app=app)
        self.portal = portal

    def handle_request(self, request):
        request.read()
        return self.portal.call(self._send, request)

    async def _send(self, request):
        response = await self.transport.handle_async_request(request)
        content = b"".join([chunk async for chunk in response.aiter_raw()])
        return httpx.Response(
            response.status_code, headers=response.headers, content=content
        )


@pytest.fixture
def client():
    from backend.api.main import app

    store.clear()
    try:
        with (
            start_blocking_portal() as portal,
            portal.wrap_async_context_manager(app.router.lifespan_context(app)),
            httpx.Client(
                transport=SyncASGITransport(app, portal),
                base_url="http://testserver",
                follow_redirects=True,
            ) as c,
        ):
            yield c
    finally:
        store.clear()


@pytest.fixture
def patient():
    from backend.ml.data import load_data
    from backend.schemas.clinical import FEATURES

    df, _ = load_data()
    return df.iloc[0][FEATURES].to_dict()
