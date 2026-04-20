"""
E2E tests — LIVE mode (real Zillow API, uses quota).

Only runs when: ZILLOW_RUN_INTEGRATION=true AND RAPIDAPI_KEY is set.
Run with: ZILLOW_RUN_INTEGRATION=true pytest tests/e2e/test_live_api.py -v
"""
import os
import pytest
from fastapi.testclient import TestClient

skip_if_no_integration = pytest.mark.skipif(
    os.getenv("ZILLOW_RUN_INTEGRATION", "false").lower() != "true"
    or not os.getenv("RAPIDAPI_KEY", "").strip(),
    reason="Set ZILLOW_RUN_INTEGRATION=true and RAPIDAPI_KEY to run live tests",
)

from main import app  # noqa: E402


@pytest.fixture(scope="module")
def live_client():
    with TestClient(app) as c:
        yield c


@skip_if_no_integration
def test_live_health_report_zillow_ok(live_client):
    resp = live_client.get("/health/report")
    assert resp.status_code == 200
    data = resp.json()
    assert data["services"]["zillow"]["status"] in ("ok", "degraded")
    assert data["services"]["geocoder"]["status"] == "ok"


@skip_if_no_integration
def test_live_search_returns_real_listings(live_client):
    resp = live_client.post("/listings/search", json={
        "location": "60614",
        "radius_miles": 3,
        "property_types": ["MultiFamily"],
        "max_results": 10,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["data_source_status"] == "ok"
    assert data["total_found"] > 0
    listing = data["listings"][0]
    assert listing["price"] is not None
    assert listing["zpid"] is not None
    assert listing["distance_miles"] is not None
    assert listing["zillow_url"].startswith("https://www.zillow.com")


@skip_if_no_integration
def test_live_search_with_full_underwriting(live_client):
    resp = live_client.post("/listings/search", json={
        "location": "60614",
        "radius_miles": 3,
        "property_types": ["MultiFamily"],
        "max_results": 5,
        "user_profile": {
            "down_payment_pct": 20.0,
            "annual_income": 120000,
            "credit_range": "720-759",
            "investment_goal": "buy_and_hold",
            "monthly_debt_payments": 500,
            "target_cash_on_cash_pct": 8.0,
        },
    })
    assert resp.status_code == 200
    listings = resp.json()["listings"]
    assert len(listings) > 0
    uw = listings[0]["underwriting"]
    assert uw is not None
    assert uw["verdict"] in ("go", "maybe", "no_go", "insufficient_data")
    assert uw["mortgage_payment"] > 0
    assert uw["total_expenses_monthly"] > 0


@skip_if_no_integration
def test_live_health_ping_cron(live_client):
    resp = live_client.post("/health/ping", json={
        "source": "integration_test",
        "env": "test",
        "note": "live e2e run",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall"] in ("ok", "degraded", "error")
    assert data["mock_mode"] is False


@skip_if_no_integration
def test_live_response_has_observability_headers(live_client):
    resp = live_client.get("/health")
    assert "x-request-id" in resp.headers
    assert "x-latency-ms" in resp.headers


@skip_if_no_integration
def test_live_search_address_input(live_client):
    resp = live_client.post("/listings/search", json={
        "location": "Wicker Park, Chicago IL",
        "radius_miles": 1,
        "property_types": ["MultiFamily"],
        "max_results": 5,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["data_source_status"] == "ok"
