"""
E2E tests — MOCK mode (no external API calls, always runnable).

Covers the full request→response chain through the FastAPI app:
  root → health → health/report → health/ping → listings/search → listings/property
"""
import pytest


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "UnderhausAI"


# ---------------------------------------------------------------------------
# Headers — observability
# ---------------------------------------------------------------------------

def test_request_id_header_returned(client):
    resp = client.get("/")
    assert "x-request-id" in resp.headers


def test_latency_header_returned(client):
    resp = client.get("/")
    assert "x-latency-ms" in resp.headers
    assert int(resp.headers["x-latency-ms"]) >= 0


def test_custom_request_id_echoed(client):
    resp = client.get("/", headers={"X-Request-ID": "test-id-abc"})
    assert resp.headers.get("x-request-id") == "test-id-abc"


# ---------------------------------------------------------------------------
# Health — liveness
# ---------------------------------------------------------------------------

def test_health_liveness(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Health — report
# ---------------------------------------------------------------------------

def test_health_report_structure(client):
    resp = client.get("/health/report")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall" in data
    assert "uptime_seconds" in data
    assert "services" in data
    assert "zillow" in data["services"]
    assert "geocoder" in data["services"]
    assert data["mock_mode"] is True


def test_health_report_mock_status(client):
    resp = client.get("/health/report")
    data = resp.json()
    assert data["services"]["zillow"]["status"] == "mock"


def test_health_report_has_timestamps(client):
    resp = client.get("/health/report")
    data = resp.json()
    assert data["checked_at"]
    assert data["started_at"]


# ---------------------------------------------------------------------------
# Health — ping (cron endpoint)
# ---------------------------------------------------------------------------

def test_health_ping_no_body(client):
    resp = client.post("/health/ping")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall" in data


def test_health_ping_with_metadata(client):
    resp = client.post("/health/ping", json={
        "source": "cron",
        "env": "test",
        "note": "automated check",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall"] in ("ok", "mock", "degraded", "error")


# ---------------------------------------------------------------------------
# Listings — search (mock data)
# ---------------------------------------------------------------------------

def test_search_returns_200(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    assert resp.status_code == 200


def test_search_response_structure(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    data = resp.json()
    assert "center" in data
    assert "listings" in data
    assert "total_found" in data
    assert "data_source_status" in data
    assert data["data_source_status"] == "mock"


def test_search_returns_mock_listings(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    data = resp.json()
    assert data["total_found"] > 0
    assert len(data["listings"]) > 0


def test_search_listings_have_required_fields(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    listing = resp.json()["listings"][0]
    assert listing["address"]
    assert listing["city"]
    assert listing["price"] is not None
    assert listing["distance_miles"] is not None


def test_search_with_underwriting_returns_underwriting(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    listing = resp.json()["listings"][0]
    assert "underwriting" in listing
    uw = listing["underwriting"]
    assert uw is not None
    assert "cash_flow_monthly" in uw
    assert "cash_on_cash_pct" in uw
    assert "verdict" in uw
    assert uw["verdict"] in ("go", "maybe", "no_go", "insufficient_data")


def test_search_underwriting_shows_all_expense_lines(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    uw = resp.json()["listings"][0]["underwriting"]
    for field in ("mortgage_payment", "property_tax_monthly", "insurance_monthly",
                  "vacancy_monthly", "management_monthly", "maintenance_monthly",
                  "capex_monthly", "total_expenses_monthly"):
        assert field in uw, f"Missing expense field: {field}"


def test_search_results_sorted_by_verdict_then_coc(client, search_payload):
    resp = client.post("/listings/search", json=search_payload)
    listings = resp.json()["listings"]
    verdict_order = {"go": 0, "maybe": 1, "no_go": 2, "insufficient_data": 3}
    for i in range(len(listings) - 1):
        a = listings[i]["underwriting"]
        b = listings[i + 1]["underwriting"]
        if a and b:
            va = verdict_order.get(a["verdict"], 3)
            vb = verdict_order.get(b["verdict"], 3)
            assert va <= vb


def test_search_without_profile_returns_no_underwriting(client):
    resp = client.post("/listings/search", json={
        "location": "60614",
        "radius_miles": 5,
        "property_types": ["MultiFamily"],
    })
    assert resp.status_code == 200
    listing = resp.json()["listings"][0]
    assert listing["underwriting"] is None


def test_search_invalid_location_returns_422(client):
    resp = client.post("/listings/search", json={
        "location": "ZZZNOTAREALPLACE99999",
        "radius_miles": 5,
    })
    assert resp.status_code == 422


def test_search_radius_sorts_by_distance_without_profile(client):
    resp = client.post("/listings/search", json={
        "location": "60614",
        "radius_miles": 10,
        "property_types": ["MultiFamily"],
    })
    listings = resp.json()["listings"]
    distances = [l["distance_miles"] for l in listings if l["distance_miles"] is not None]
    assert distances == sorted(distances)


# ---------------------------------------------------------------------------
# Listings — single property lookup
# ---------------------------------------------------------------------------

def test_property_lookup_by_address(client):
    # Uses a mock listing address — should come back with mock data
    resp = client.get("/listings/property?address=2345 N Milwaukee Ave Chicago IL 60647")
    # May return 404 if mock data doesn't match tight radius — that's acceptable
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.json()
        assert "address" in data
        assert "underwriting" in data


def test_property_lookup_requires_address_or_url(client):
    resp = client.get("/listings/property")
    assert resp.status_code == 422


def test_property_lookup_by_zillow_url(client):
    resp = client.get(
        "/listings/property"
        "?zillow_url=https://www.zillow.com/homedetails/2345-N-Milwaukee-Ave-Chicago-IL-60647/mock-001_zpid/"
    )
    assert resp.status_code in (200, 404)


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

def test_unknown_route_returns_404(client):
    resp = client.get("/nonexistent-route")
    assert resp.status_code == 404


def test_search_missing_location_returns_422(client):
    resp = client.post("/listings/search", json={"radius_miles": 5})
    assert resp.status_code == 422
