"""
Listing Agent — Phase 1 orchestrator.

Flow: geocode → scrape Zillow → (optionally) underwrite each listing → rank → return.
"""
import logging
from typing import Optional

from models.listing import (
    ListingSearchRequest,
    ListingSearchResponse,
    ListingWithUnderwriting,
    Coordinates,
    DataSourceStatus,
)
from scrapers import zillow
from agents.underwriting_engine import underwrite
from services.geocoder import geocode
from services.cache import listing_cache, geocode_cache

logger = logging.getLogger(__name__)


def _cache_key(req: ListingSearchRequest) -> str:
    types = ",".join(sorted(t.value for t in req.property_types))
    return (
        f"{req.location}|{req.radius_miles}|{types}|{req.status.value}"
        f"|{req.min_price}|{req.max_price}|{req.min_beds}"
    )


async def run(req: ListingSearchRequest) -> ListingSearchResponse:
    # --- 1. Geocode ---
    geo_key = req.location.lower().strip()
    cached_geo = geocode_cache.get(geo_key)
    if cached_geo:
        lat, lng, resolved = cached_geo
        logger.info(f"Geocode cache hit for '{req.location}'")
    else:
        lat, lng, resolved = await geocode(req.location)
        geocode_cache.set(geo_key, (lat, lng, resolved))

    center = Coordinates(lat=lat, lng=lng)

    # --- 2. Check listing cache (cache key ignores user_profile — underwriting is re-run) ---
    cache_key = _cache_key(req)
    cached_listings = listing_cache.get(cache_key)

    if cached_listings is not None:
        logger.info(f"Listing cache hit for '{req.location}'")
        raw_listings, src_status, error_detail = cached_listings
    else:
        raw_listings, src_status, error_detail = await zillow.search_listings(
            location=req.location,
            center_lat=lat,
            center_lng=lng,
            radius_miles=req.radius_miles,
            property_types=[t.value for t in req.property_types],
            status=req.status.value,
            min_price=req.min_price,
            max_price=req.max_price,
            min_beds=req.min_beds,
            max_results=req.max_results,
        )
        if src_status in (DataSourceStatus.ok, DataSourceStatus.mock):
            listing_cache.set(cache_key, (raw_listings, src_status, error_detail))

    # --- 3. Underwrite each listing (if user_profile provided) ---
    results: list[ListingWithUnderwriting] = []
    for listing in raw_listings:
        uw = underwrite(listing, req.user_profile) if req.user_profile else None
        results.append(ListingWithUnderwriting(**listing.model_dump(), underwriting=uw))

    # --- 4. Rank ---
    if req.user_profile:
        # Sort: go → maybe → no_go → insufficient_data, then by cash-on-cash descending
        verdict_order = {"go": 0, "maybe": 1, "no_go": 2, "insufficient_data": 3}
        results.sort(key=lambda x: (
            verdict_order.get(x.underwriting.verdict.value, 3) if x.underwriting else 3,
            -(x.underwriting.cash_on_cash_pct if x.underwriting else 0),
        ))
    else:
        results.sort(key=lambda x: x.distance_miles or 999)

    return ListingSearchResponse(
        center=center,
        radius_miles=req.radius_miles,
        location_resolved=resolved,
        total_found=len(results),
        listings=results,
        data_source_status=src_status,
        error_detail=error_detail,
    )
