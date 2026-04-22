from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from models.listing import ListingSearchRequest, ListingSearchResponse, ListingWithUnderwriting, UserProfile, DataSourceStatus
from agents import listing_agent
from agents.underwriting_engine import underwrite
from scrapers import zillow_property
from db.session import get_db

router = APIRouter(prefix="/listings", tags=["listings"])


@router.post("/search", response_model=ListingSearchResponse)
async def search_listings(req: ListingSearchRequest, db: AsyncSession = Depends(get_db)):
    """
    Search for listings within a radius of a zip code or address.
    Optionally include a user_profile to receive underwriting on each result.
    """
    try:
        return await listing_agent.run(req, db=db)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.get("/property", response_model=ListingWithUnderwriting)
async def get_property(
    address: Optional[str] = Query(default=None, description="Street address, e.g. '2254 N Racine Ave, Chicago IL 60614'"),
    zillow_url: Optional[str] = Query(default=None, description="Full Zillow listing URL — address is extracted automatically"),
    down_payment_pct: float = Query(default=20.0),
    annual_income: Optional[int] = Query(default=None),
    credit_range: str = Query(default="720-759"),
    investment_goal: str = Query(default="buy_and_hold"),
    monthly_debt_payments: float = Query(default=0.0),
    target_cash_on_cash_pct: float = Query(default=8.0),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch a single Zillow listing by address or Zillow URL, with underwriting.

    Examples:
      GET /listings/property?address=2254 N Racine Ave, Chicago IL 60614
      GET /listings/property?zillow_url=https://www.zillow.com/homedetails/2254-N-Racine-Ave-Chicago-IL-60614/2128438063_zpid/
    """
    from models.listing import CreditRange, InvestmentGoal
    import re

    if not address and not zillow_url:
        raise HTTPException(status_code=422, detail="Provide either address or zillow_url")

    # Extract address from Zillow URL path if needed
    # URL format: /homedetails/2254-N-Racine-Ave-Chicago-IL-60614/ZPID_zpid/
    lookup_address = address
    if not lookup_address and zillow_url:
        match = re.search(r"/homedetails/([^/]+)/[^/]+_zpid", zillow_url)
        if match:
            # Convert URL slug to address: dashes → spaces
            lookup_address = match.group(1).replace("-", " ")
        else:
            raise HTTPException(status_code=422, detail="Could not extract address from Zillow URL. Paste the full URL like: https://www.zillow.com/homedetails/123-Main-St-City-ST-12345/12345_zpid/")

    # Do a tight 0.1-mile radius search centered on this address
    req = ListingSearchRequest(
        location=lookup_address,
        radius_miles=0.1,
        property_types=["All"],
        max_results=5,
        user_profile=UserProfile(
            down_payment_pct=down_payment_pct,
            annual_income=annual_income,
            credit_range=CreditRange(credit_range),
            investment_goal=InvestmentGoal(investment_goal),
            monthly_debt_payments=monthly_debt_payments,
            target_cash_on_cash_pct=target_cash_on_cash_pct,
        )
    )

    try:
        result = await listing_agent.run(req, db=db)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not result.listings:
        raise HTTPException(status_code=404, detail=f"No listing found at '{lookup_address}'. The property may be off-market.")

    # Return the closest match
    return result.listings[0]
