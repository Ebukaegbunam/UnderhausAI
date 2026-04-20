"""
E2E test fixtures.

TestClient runs the full FastAPI app in-process — no server needed.
All tests in test_mock_api.py use MOCK mode (no external API calls).
Tests in test_live_api.py run only when ZILLOW_RUN_INTEGRATION=true.
"""
import os
import pytest
from fastapi.testclient import TestClient

# Force mock mode — must be set before app import so scrapers pick it up
os.environ["ZILLOW_MOCK_MODE"] = "true"
os.environ.setdefault("RAPIDAPI_KEY", "test-key-not-used-in-mock")

from main import app  # noqa: E402 — import after env vars set


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Synchronous TestClient — works for both sync and async routes."""
    from services.cache import listing_cache, geocode_cache
    listing_cache.clear()
    geocode_cache.clear()
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture(scope="module")
def search_payload() -> dict:
    return {
        "location": "60614",
        "radius_miles": 5,
        "property_types": ["MultiFamily"],
        "user_profile": {
            "down_payment_pct": 20.0,
            "annual_income": 120000,
            "credit_range": "720-759",
            "investment_goal": "buy_and_hold",
            "monthly_debt_payments": 500,
            "target_cash_on_cash_pct": 8.0,
        },
    }
