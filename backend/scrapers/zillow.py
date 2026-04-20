"""
Zillow scraper via letsscrape / real-estate-zillow-com on RapidAPI.

API host: real-estate-zillow-com.p.rapidapi.com
Docs:     https://rapidapi.com/letsscrape/api/real-estate-zillow-com

Search flow:
  1. Caller provides center lat/lng + radius (computed by geocoder upstream)
  2. We convert radius → bounding box (north/south/east/west)
  3. POST to /zillow/v1/search/coords with bounding box + filters
  4. Normalize response → Listing models
  5. Post-filter by true Haversine distance (bounding box over-fetches corners)
"""
import os
import logging
from math import radians, sin, cos, sqrt, atan2
from typing import Optional

import httpx

from models.listing import Listing, Coordinates, DataSourceStatus

logger = logging.getLogger(__name__)

RAPIDAPI_HOST = "real-estate-zillow-com.p.rapidapi.com"
RAPIDAPI_BASE = f"https://{RAPIDAPI_HOST}"

# ---------------------------------------------------------------------------
# Mock data — realistic Chicago multi-family listings for dev/testing
# ---------------------------------------------------------------------------
def _mock(zpid, street, city, state, zipcode, price, beds, baths, sqft,
          lat, lng, prop_type, dom, ppsf, rent_z, zest, tax_rate, detail):
    """Build a mock listing using the real API's field names."""
    return {
        "zpid": zpid,
        "addressStreet": street, "addressCity": city,
        "addressState": state, "addressZipcode": zipcode,
        "unformattedPrice": price,
        "beds": beds, "baths": baths, "area": sqft,
        "latLong": {"latitude": lat, "longitude": lng},
        "hdpData": {"homeInfo": {
            "homeType": prop_type, "daysOnZillow": dom,
            "rentZestimate": rent_z, "taxAssessedValue": int(price * tax_rate / 100),
        }},
        "pricePerSquareFoot": ppsf,
        "zestimate": zest, "imgSrc": None,
        "detailUrl": f"https://www.zillow.com/homedetails/{detail}/{zpid}_zpid/",
    }


_MOCK_RAW = [
    _mock("mock-001", "2345 N Milwaukee Ave", "Chicago", "IL", "60647",
          425000, 6, 3.0, 2800, 41.9214, -87.6981, "MULTI_FAMILY", 12, 151, 3800, 430000, 1.9,
          "2345-N-Milwaukee-Ave-Chicago-IL-60647"),
    _mock("mock-002", "1812 W Division St", "Chicago", "IL", "60622",
          549000, 8, 4.0, 3600, 41.9031, -87.6739, "MULTI_FAMILY", 3, 152, 5200, 555000, 1.9,
          "1812-W-Division-St-Chicago-IL-60622"),
    _mock("mock-003", "3101 N Kedzie Ave", "Chicago", "IL", "60618",
          375000, 4, 2.0, 2200, 41.9378, -87.7053, "MULTI_FAMILY", 28, 170, 2900, 370000, 1.9,
          "3101-N-Kedzie-Ave-Chicago-IL-60618"),
    _mock("mock-004", "4420 N Western Ave", "Chicago", "IL", "60625",
          615000, 9, 4.5, 4100, 41.9612, -87.6885, "MULTI_FAMILY", 7, 150, 5900, 620000, 1.9,
          "4420-N-Western-Ave-Chicago-IL-60625"),
    _mock("mock-005", "720 W Wrightwood Ave", "Chicago", "IL", "60614",
          899000, 6, 3.0, 3200, 41.9298, -87.6469, "MULTI_FAMILY", 45, 281, 4800, 890000, 1.9,
          "720-W-Wrightwood-Ave-Chicago-IL-60614"),
]


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 3958.8
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def radius_to_bbox(lat: float, lng: float, radius_miles: float) -> dict:
    """Convert a center point + radius into a bounding box."""
    lat_delta = radius_miles / 69.0
    lng_delta = radius_miles / (69.0 * cos(radians(lat)))
    return {
        "north": lat + lat_delta,
        "south": lat - lat_delta,
        "east":  lng + lng_delta,
        "west":  lng - lng_delta,
    }


# ---------------------------------------------------------------------------
# Normalizer
# ---------------------------------------------------------------------------

def _normalize(raw: dict, center_lat: float, center_lng: float) -> Optional[Listing]:
    try:
        # Coordinates — nested under latLong
        lat_lng = raw.get("latLong") or {}
        lat = lat_lng.get("latitude")
        lng = lat_lng.get("longitude")
        coords = Coordinates(lat=lat, lng=lng) if (lat and lng) else None
        distance = (
            round(haversine_miles(center_lat, center_lng, lat, lng), 2)
            if (lat and lng) else None
        )

        # Address — pre-split by the API
        street   = raw.get("addressStreet", "")
        city     = raw.get("addressCity", "")
        state    = raw.get("addressState", "")
        zip_code = raw.get("addressZipcode", "")

        # Deep fields live under hdpData.homeInfo
        home_info = (raw.get("hdpData") or {}).get("homeInfo") or {}

        # Price: unformattedPrice (sale/sold) or price
        price = raw.get("unformattedPrice") or raw.get("price") or home_info.get("price")

        # Rent zestimate is in homeInfo
        rent_zestimate = home_info.get("rentZestimate") or raw.get("rentZestimate")

        # Days on Zillow
        days_on_market = home_info.get("daysOnZillow") or raw.get("daysOnZillow")

        # Tax assessed value as proxy for annual tax (not perfect but available)
        annual_tax = home_info.get("taxAssessedValue")

        # Zestimate
        zestimate = raw.get("zestimate") or home_info.get("zestimate")

        # Detail URL — already a full URL in this API
        zillow_url = raw.get("detailUrl") or None

        # Property type
        prop_type = (
            home_info.get("homeType") or raw.get("propertyType") or ""
        ).replace("_", " ").title()

        return Listing(
            zpid=str(raw["zpid"]) if raw.get("zpid") else None,
            address=street,
            city=city,
            state=state,
            zip_code=zip_code,
            price=int(price) if price else None,
            beds=raw.get("beds") or home_info.get("bedrooms"),
            baths=raw.get("baths") or home_info.get("bathrooms"),
            sqft=raw.get("area") or home_info.get("livingArea"),
            property_type=prop_type,
            coordinates=coords,
            distance_miles=distance,
            zillow_url=zillow_url,
            image_url=raw.get("imgSrc"),
            days_on_market=days_on_market,
            price_per_sqft=raw.get("pricePerSquareFoot"),
            zestimate=int(zestimate) if zestimate else None,
            rent_zestimate=int(rent_zestimate) if rent_zestimate else None,
            hoa_fee=raw.get("hoaFee"),
            annual_tax=int(annual_tax) if annual_tax else None,
        )
    except Exception as e:
        logger.warning(f"Failed to normalize listing zpid={raw.get('zpid')}: {e}")
        return None


# ---------------------------------------------------------------------------
# Property type mapping
# letsscrape API uses lowercase snake_case: multi_family, single_family, etc.
# Our enum values use TitleCase: MultiFamily, SingleFamily, etc.
# ---------------------------------------------------------------------------
_PROP_TYPE_MAP = {
    "MultiFamily":   "multi_family",
    "SingleFamily":  "house",
    "Condo":         "condo",
    "Townhouse":     "townhouse",
    "All":           None,
}

_STATUS_MAP = {
    "ForSale": "sale",
    "ForRent": "rent",
}


# ---------------------------------------------------------------------------
# Main search function
# ---------------------------------------------------------------------------

async def search_listings(
    location: str,
    center_lat: float,
    center_lng: float,
    radius_miles: float,
    property_types: list[str],
    status: str = "ForSale",
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_beds: Optional[int] = None,
    max_results: int = 50,
) -> tuple[list[Listing], DataSourceStatus, Optional[str]]:
    """
    Search Zillow listings within radius_miles of center_lat/lng.
    Returns (listings, status, error_detail).
    """
    mock_mode = os.getenv("ZILLOW_MOCK_MODE", "false").lower() == "true"
    api_key = os.getenv("RAPIDAPI_KEY", "").strip()

    # --- Mock mode ---
    if mock_mode:
        logger.info("Zillow scraper: MOCK mode active")
        listings = []
        for raw in _MOCK_RAW:
            listing = _normalize(raw, center_lat, center_lng)
            if listing and (listing.distance_miles or 0) <= radius_miles:
                listings.append(listing)
        listings.sort(key=lambda x: x.distance_miles or 999)
        return listings[:max_results], DataSourceStatus.mock, None

    # --- Real mode ---
    if not api_key:
        logger.error("RAPIDAPI_KEY is not set")
        return [], DataSourceStatus.error, "RAPIDAPI_KEY not configured in .env"

    bbox = radius_to_bbox(center_lat, center_lng, radius_miles)
    api_status = _STATUS_MAP.get(status, "sale")

    # Map property types, drop None (means "All")
    api_types = [
        _PROP_TYPE_MAP[t] for t in property_types
        if t in _PROP_TYPE_MAP and _PROP_TYPE_MAP[t] is not None
    ]

    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": api_key,
    }

    all_listings: list[Listing] = []
    page = 1
    MAX_PAGES = 10

    async with httpx.AsyncClient(timeout=20.0) as client:
        while len(all_listings) < max_results and page <= MAX_PAGES:
            params: dict = {
                "north": str(bbox["north"]),
                "south": str(bbox["south"]),
                "east":  str(bbox["east"]),
                "west":  str(bbox["west"]),
                "type":  api_status,
                "page":  str(page),
            }

            if api_types:
                params["property_types"] = ",".join(api_types)
            if min_price is not None:
                params["price_min"] = str(min_price)
            if max_price is not None:
                params["price_max"] = str(max_price)
            if min_beds is not None:
                params["beds_min"] = str(min_beds)

            try:
                resp = await client.get(
                    f"{RAPIDAPI_BASE}/v1/search/coords",
                    headers=headers,
                    params=params,
                )
            except httpx.TimeoutException:
                logger.error("Zillow API timed out")
                out_status = DataSourceStatus.degraded if all_listings else DataSourceStatus.error
                return all_listings, out_status, "Zillow API timed out — partial results returned"
            except httpx.RequestError as e:
                logger.error(f"Zillow API network error: {e}")
                return all_listings, DataSourceStatus.error, f"Network error: {e}"

            if resp.status_code == 429:
                logger.warning("Zillow API rate limited (429)")
                return all_listings, DataSourceStatus.degraded, "Rate limited — try again in 60 seconds"

            if resp.status_code == 403:
                logger.error("Zillow API key rejected (403)")
                return [], DataSourceStatus.error, "API key invalid or quota exceeded"

            if resp.status_code == 500:
                # API retries internally 3x before returning 500 — Zillow blocked
                logger.warning("Zillow scraper blocked (500) — rare, retryable")
                return all_listings, DataSourceStatus.degraded, "Zillow temporarily blocked the scraper — retry in a moment"

            if resp.status_code != 200:
                logger.error(f"Zillow API {resp.status_code}: {resp.text[:300]}")
                return all_listings, DataSourceStatus.error, f"Upstream error {resp.status_code}"

            try:
                body = resp.json()
            except Exception:
                logger.error(f"Zillow returned unparseable response: {resp.text[:300]}")
                return all_listings, DataSourceStatus.error, "Parse error — unexpected response format"

            # Response shape: {"status": 200, "data": {"listings": [...], "totalCount": N}}
            data = body.get("data", {})
            props = data.get("listings", [])

            if not props:
                break

            for raw in props:
                listing = _normalize(raw, center_lat, center_lng)
                if listing and (listing.distance_miles or 0) <= radius_miles:
                    all_listings.append(listing)

            total = data.get("totalCount", data.get("totalResultCount", 0))
            if len(all_listings) >= total:
                break
            page += 1

    all_listings.sort(key=lambda x: x.distance_miles or 999)
    return all_listings[:max_results], DataSourceStatus.ok, None
