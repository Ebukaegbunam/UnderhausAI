"""
Zillow single-property lookup via letsscrape RapidAPI.

Endpoint: GET /v1/property
Accepts:  zpid (Zillow Property ID) OR full Zillow listing URL
Returns:  Full property detail — all fields Zillow shows on the listing page
"""
import os
import logging
from typing import Optional

import httpx

from models.listing import Listing, Coordinates, DataSourceStatus

logger = logging.getLogger(__name__)

RAPIDAPI_HOST = "real-estate-zillow-com.p.rapidapi.com"
RAPIDAPI_BASE = f"https://{RAPIDAPI_HOST}"


def _normalize_detail(raw: dict) -> Optional[Listing]:
    """
    Normalize the /v1/property response into a Listing.
    The detail endpoint returns a richer shape than the search endpoint.
    """
    try:
        zpid = str(raw.get("zpid", "")) or None

        # Coordinates
        lat = raw.get("latitude")
        lng = raw.get("longitude")
        coords = Coordinates(lat=lat, lng=lng) if (lat and lng) else None

        # Address
        street   = raw.get("streetAddress", "")
        city     = raw.get("city", "")
        state    = raw.get("state", "")
        zip_code = raw.get("zipcode", "")

        # Price — detail endpoint uses "price" directly
        price = raw.get("price")

        # Zestimates
        zestimate      = raw.get("zestimate")
        rent_zestimate = raw.get("rentZestimate")

        # Tax — detail response has taxHistory list; take most recent year
        annual_tax = None
        tax_history = raw.get("taxHistory") or []
        if tax_history:
            annual_tax = tax_history[0].get("taxPaid")

        # HOA
        hoa_fee = (raw.get("hoaFee") or {}).get("amount") if isinstance(raw.get("hoaFee"), dict) else raw.get("hoaFee")

        # Zillow URL
        zillow_url = raw.get("url") or raw.get("hdpUrl")
        if zillow_url and zillow_url.startswith("/"):
            zillow_url = f"https://www.zillow.com{zillow_url}"

        return Listing(
            zpid=zpid,
            address=street,
            city=city,
            state=state,
            zip_code=zip_code,
            price=int(price) if price else None,
            beds=raw.get("bedrooms"),
            baths=raw.get("bathrooms"),
            sqft=raw.get("livingArea"),
            lot_sqft=raw.get("lotAreaValue"),
            year_built=raw.get("yearBuilt"),
            property_type=(raw.get("homeType") or "").replace("_", " ").title(),
            coordinates=coords,
            distance_miles=None,  # no center point for single-property lookup
            zillow_url=zillow_url,
            image_url=(raw.get("photos") or [{}])[0].get("mixedSources", {}).get("jpeg", [{}])[0].get("url") if raw.get("photos") else raw.get("imgSrc"),
            days_on_market=raw.get("daysOnZillow"),
            price_per_sqft=raw.get("pricePerSquareFoot") or (int(price / raw["livingArea"]) if price and raw.get("livingArea") else None),
            zestimate=int(zestimate) if zestimate else None,
            rent_zestimate=int(rent_zestimate) if rent_zestimate else None,
            hoa_fee=int(hoa_fee) if hoa_fee else None,
            annual_tax=int(annual_tax) if annual_tax else None,
        )
    except Exception as e:
        logger.warning(f"Failed to normalize property detail zpid={raw.get('zpid')}: {e}")
        return None


async def get_property(
    zpid: Optional[str] = None,
    url: Optional[str] = None,
) -> tuple[Optional[Listing], Optional[dict], DataSourceStatus, Optional[str]]:
    """
    Fetch full property detail by ZPID or Zillow URL.

    Returns:
        (listing, raw_detail, status, error_detail)
        raw_detail contains the full API response for fields not in the Listing model
        (price history, tax history, schools, description, etc.)
    """
    if not zpid and not url:
        return None, None, DataSourceStatus.error, "Must provide either zpid or url"

    api_key = os.getenv("RAPIDAPI_KEY", "").strip()
    if not api_key:
        return None, None, DataSourceStatus.error, "RAPIDAPI_KEY not configured in .env"

    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": api_key,
    }

    params: dict = {}
    if zpid:
        params["zpid"] = str(zpid)
    elif url:
        params["url"] = url

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.get(
                f"{RAPIDAPI_BASE}/v1/property",
                headers=headers,
                params=params,
            )
        except httpx.TimeoutException:
            return None, None, DataSourceStatus.degraded, "Zillow API timed out"
        except httpx.RequestError as e:
            return None, None, DataSourceStatus.error, f"Network error: {e}"

    if resp.status_code == 404:
        return None, None, DataSourceStatus.error, f"Property not found: zpid={zpid or url}"
    if resp.status_code == 429:
        return None, None, DataSourceStatus.degraded, "Rate limited — try again in 60 seconds"
    if resp.status_code == 403:
        return None, None, DataSourceStatus.error, "API key invalid or quota exceeded"
    if resp.status_code != 200:
        return None, None, DataSourceStatus.error, f"Upstream error {resp.status_code}"

    try:
        body = resp.json()
    except Exception:
        return None, None, DataSourceStatus.error, "Parse error — unexpected response format"

    raw = body.get("data") or body
    listing = _normalize_detail(raw)

    if not listing:
        return None, raw, DataSourceStatus.error, "Could not parse property data"

    return listing, raw, DataSourceStatus.ok, None
