"""
Tests for the Zillow scraper module.

Unit tests run always (no API key needed).
Integration test runs only when ZILLOW_RUN_INTEGRATION=true is set.
"""
import os
import pytest
from scrapers.zillow import haversine_miles, _normalize
from models.listing import Coordinates, DataSourceStatus


# ---------------------------------------------------------------------------
# Distance
# ---------------------------------------------------------------------------

def test_haversine_same_point():
    assert haversine_miles(41.9, -87.6, 41.9, -87.6) == 0.0


def test_haversine_known_distance():
    # Chicago Loop to O'Hare is ~17 miles
    dist = haversine_miles(41.8827, -87.6233, 41.9742, -87.9073)
    assert 15 < dist < 19


def test_haversine_symmetry():
    d1 = haversine_miles(41.9, -87.6, 41.85, -87.65)
    d2 = haversine_miles(41.85, -87.65, 41.9, -87.6)
    assert abs(d1 - d2) < 0.001


# ---------------------------------------------------------------------------
# Normalizer — uses real API response shape (address pre-split, latLong nested)
# ---------------------------------------------------------------------------

RAW_LISTING = {
    "zpid": "12345",
    "addressStreet": "2345 N Milwaukee Ave",
    "addressCity": "Chicago",
    "addressState": "IL",
    "addressZipcode": "60647",
    "unformattedPrice": 425000,
    "beds": 6,
    "baths": 3.0,
    "area": 2800,
    "latLong": {"latitude": 41.9214, "longitude": -87.6981},
    "pricePerSquareFoot": 151,
    "zestimate": 430000,
    "detailUrl": "https://www.zillow.com/homedetails/12345_zpid/",
    "imgSrc": "https://photos.zillowstatic.com/test.jpg",
    "hdpData": {
        "homeInfo": {
            "rentZestimate": 3800,
            "daysOnZillow": 12,
            "homeType": "MULTI_FAMILY",
            "taxAssessedValue": 310000,
        }
    },
}

CENTER_LAT, CENTER_LNG = 41.9214, -87.6513


def test_normalize_happy_path():
    listing = _normalize(RAW_LISTING, CENTER_LAT, CENTER_LNG)
    assert listing is not None
    assert listing.zpid == "12345"
    assert listing.address == "2345 N Milwaukee Ave"
    assert listing.city == "Chicago"
    assert listing.state == "IL"
    assert listing.zip_code == "60647"
    assert listing.price == 425000
    assert listing.beds == 6
    assert listing.sqft == 2800
    assert listing.rent_zestimate == 3800
    assert listing.zestimate == 430000
    assert listing.days_on_market == 12
    assert listing.distance_miles is not None
    assert listing.zillow_url.startswith("https://www.zillow.com")


def test_normalize_computes_distance():
    listing = _normalize(RAW_LISTING, CENTER_LAT, CENTER_LNG)
    expected = haversine_miles(CENTER_LAT, CENTER_LNG, 41.9214, -87.6981)
    assert abs(listing.distance_miles - expected) < 0.01


def test_normalize_tax_from_hdp():
    listing = _normalize(RAW_LISTING, CENTER_LAT, CENTER_LNG)
    assert listing.annual_tax == 310000  # from hdpData.homeInfo.taxAssessedValue


def test_normalize_missing_coords_ok():
    raw = {**RAW_LISTING, "latLong": None}
    listing = _normalize(raw, CENTER_LAT, CENTER_LNG)
    assert listing is not None
    assert listing.coordinates is None
    assert listing.distance_miles is None


def test_normalize_bad_data_returns_none():
    listing = _normalize({}, CENTER_LAT, CENTER_LNG)
    assert listing is None or listing.address == ""


# ---------------------------------------------------------------------------
# Integration test — only runs when ZILLOW_RUN_INTEGRATION=true
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("ZILLOW_RUN_INTEGRATION", "false").lower() != "true",
    reason="Set ZILLOW_RUN_INTEGRATION=true to run live API tests",
)
async def test_integration_search_returns_listings():
    from scrapers.zillow import search_listings
    listings, status, error = await search_listings(
        location="60614",
        center_lat=41.9214,
        center_lng=-87.6513,
        radius_miles=5.0,
        property_types=["MultiFamily"],
        status="ForSale",
        max_results=10,
    )
    assert status in (DataSourceStatus.ok, DataSourceStatus.mock)
    assert isinstance(listings, list)
    if listings:
        assert listings[0].price is not None
        assert listings[0].distance_miles is not None
