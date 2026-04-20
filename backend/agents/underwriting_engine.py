"""
Underwriting Engine — Phase 1 core.

Takes a Listing + UserProfile and produces a full UnderwritingResult.
Every assumption is explicit and visible. Nothing is a black box.
"""
import logging
from math import ceil
from typing import Optional

from models.listing import (
    Listing,
    UserProfile,
    UnderwritingResult,
    UnderwritingVerdict,
    InvestmentGoal,
    CreditRange,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate lookup — estimated mortgage rates by credit range + loan type
# These are indicative; users can override in future iterations
# ---------------------------------------------------------------------------
_RATE_TABLE: dict[CreditRange, dict[str, float]] = {
    CreditRange.excellent: {"conventional": 6.75, "fha": 6.50},
    CreditRange.good:      {"conventional": 7.00, "fha": 6.75},
    CreditRange.fair:      {"conventional": 7.50, "fha": 7.00},
    CreditRange.below_fair:{"conventional": 8.25, "fha": 7.50},
}

# FHA requires < 10% down and goal == house_hack for owner-occupied benefit
_FHA_MAX_DOWN = 0.10


def _is_fha_eligible(profile: UserProfile) -> bool:
    return (
        profile.investment_goal == InvestmentGoal.house_hack
        and (profile.down_payment_pct / 100) <= _FHA_MAX_DOWN
    )


def _estimated_rate(profile: UserProfile) -> float:
    loan_type = "fha" if _is_fha_eligible(profile) else "conventional"
    return _RATE_TABLE[profile.credit_range][loan_type]


def _monthly_mortgage(principal: float, annual_rate_pct: float, years: int = 30) -> float:
    """Standard amortization formula."""
    r = (annual_rate_pct / 100) / 12
    n = years * 12
    if r == 0:
        return principal / n
    return principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)


def _estimate_rent(listing: Listing, goal: InvestmentGoal) -> tuple[int, str]:
    """
    Returns (monthly_rent_estimate, source_label).
    Priority: rent_zestimate → price-based rule of thumb.
    """
    if listing.rent_zestimate and listing.rent_zestimate > 0:
        rent = listing.rent_zestimate
        # For house hacking, user lives in one unit — adjust for partial rental income
        if goal == InvestmentGoal.house_hack and listing.beds and listing.beds >= 4:
            # Assume user occupies ~1/N of units (rough: 1 of beds/2 units)
            units = max(2, ceil((listing.beds or 2) / 2))
            rent = int(rent * (units - 1) / units)
            return rent, "zestimate_house_hack_adjusted"
        return rent, "zestimate"

    # Fallback: 0.7% of price per month (conservative rule of thumb for multi-family)
    if listing.price:
        rent = int(listing.price * 0.007)
        if goal == InvestmentGoal.house_hack and listing.beds and listing.beds >= 4:
            units = max(2, ceil((listing.beds or 2) / 2))
            rent = int(rent * (units - 1) / units)
            return rent, "price_estimate_house_hack_adjusted"
        return rent, "price_estimate_0.7pct"

    return 0, "unknown"


def underwrite(listing: Listing, profile: UserProfile) -> Optional[UnderwritingResult]:
    """
    Run underwriting on a single listing against a user profile.
    Returns None if the listing lacks the minimum data needed (no price).
    """
    if not listing.price:
        logger.debug(f"Skipping underwriting for {listing.address} — no price")
        return None

    price = listing.price
    flags: list[str] = []

    # --- Financing ---
    down_pct = profile.down_payment_pct / 100
    down_dollars = int(price * down_pct)
    loan_amount = price - down_dollars
    rate = _estimated_rate(profile)
    mortgage = _monthly_mortgage(loan_amount, rate)

    # --- Income ---
    monthly_rent, rent_source = _estimate_rent(listing, profile.investment_goal)
    if rent_source in ("price_estimate_0.7pct", "price_estimate_house_hack_adjusted"):
        flags.append("Rent estimated from price (no Zillow rental data) — verify with local comps")

    # --- Expenses ---
    # Tax: use listing data if available, else estimate 1.2% of price annually
    annual_tax = listing.annual_tax or int(price * 0.012)
    tax_monthly = annual_tax / 12

    # Insurance: user override or estimate 0.5% of price annually
    annual_insurance = profile.insurance_annual or int(price * 0.005)
    insurance_monthly = annual_insurance / 12

    # Operating expense rates applied to gross rent
    vacancy_monthly     = monthly_rent * (profile.vacancy_rate_pct / 100)
    management_monthly  = monthly_rent * (profile.management_fee_pct / 100)
    maintenance_monthly = monthly_rent * (profile.maintenance_pct / 100)
    capex_monthly       = monthly_rent * (profile.capex_pct / 100)
    hoa_monthly         = float(listing.hoa_fee or 0)

    if hoa_monthly > 0:
        flags.append(f"HOA fee ${hoa_monthly:.0f}/mo included in expenses")

    total_expenses = (
        mortgage
        + tax_monthly
        + insurance_monthly
        + vacancy_monthly
        + management_monthly
        + maintenance_monthly
        + capex_monthly
        + hoa_monthly
    )

    # --- Returns ---
    cash_flow_monthly = monthly_rent - total_expenses
    noi_annual = (monthly_rent - tax_monthly - insurance_monthly
                  - vacancy_monthly - management_monthly
                  - maintenance_monthly - capex_monthly - hoa_monthly) * 12
    cash_on_cash = (cash_flow_monthly * 12) / down_dollars * 100 if down_dollars > 0 else 0
    cap_rate = (noi_annual / price) * 100
    grm = price / (monthly_rent * 12) if monthly_rent > 0 else 0
    dscr = (monthly_rent / mortgage) if mortgage > 0 else 0

    # --- Flags ---
    if listing.days_on_market and listing.days_on_market > 60:
        flags.append(f"Listed for {listing.days_on_market} days — investigate why it hasn't sold")

    if listing.year_built and listing.year_built < 1960:
        flags.append(f"Built {listing.year_built} — budget for lead paint, knob-and-tube wiring, or plumbing upgrades")

    if dscr < 1.0:
        flags.append(f"DSCR {dscr:.2f} — rent does not cover the mortgage (lenders typically require 1.25+)")

    if grm > 20:
        flags.append(f"GRM of {grm:.1f} is high — price may be elevated relative to rental income")

    if profile.investment_goal == InvestmentGoal.short_term_rental:
        flags.append("STR income is not reflected here — run STR-specific comp analysis before proceeding")

    # --- Verdict ---
    if monthly_rent == 0:
        verdict = UnderwritingVerdict.insufficient_data
        verdict_reason = "Cannot underwrite — no rent data available"
    elif cash_on_cash >= profile.target_cash_on_cash_pct and dscr >= 1.0:
        verdict = UnderwritingVerdict.go
        verdict_reason = (
            f"Cash-on-cash of {cash_on_cash:.1f}% meets your {profile.target_cash_on_cash_pct:.0f}% "
            f"target and DSCR of {dscr:.2f} covers the mortgage"
        )
    elif cash_on_cash >= (profile.target_cash_on_cash_pct * 0.6) and dscr >= 0.9:
        verdict = UnderwritingVerdict.maybe
        verdict_reason = (
            f"Cash-on-cash of {cash_on_cash:.1f}% is below your target but close — "
            f"worth investigating with better rent data or negotiating the price down"
        )
    else:
        verdict = UnderwritingVerdict.no_go
        verdict_reason = (
            f"Cash-on-cash of {cash_on_cash:.1f}% is well below your {profile.target_cash_on_cash_pct:.0f}% "
            f"target — this deal does not pencil at asking price"
        )

    return UnderwritingResult(
        purchase_price=price,
        down_payment_dollars=down_dollars,
        down_payment_pct=profile.down_payment_pct,
        loan_amount=loan_amount,
        estimated_rate_pct=rate,
        loan_term_years=30,
        estimated_monthly_rent=monthly_rent,
        rent_source=rent_source,
        mortgage_payment=round(mortgage, 2),
        property_tax_monthly=round(tax_monthly, 2),
        insurance_monthly=round(insurance_monthly, 2),
        vacancy_monthly=round(vacancy_monthly, 2),
        management_monthly=round(management_monthly, 2),
        maintenance_monthly=round(maintenance_monthly, 2),
        capex_monthly=round(capex_monthly, 2),
        hoa_monthly=round(hoa_monthly, 2),
        total_expenses_monthly=round(total_expenses, 2),
        noi_annual=round(noi_annual, 2),
        cash_flow_monthly=round(cash_flow_monthly, 2),
        cash_on_cash_pct=round(cash_on_cash, 2),
        cap_rate_pct=round(cap_rate, 2),
        gross_rent_multiplier=round(grm, 2),
        dscr=round(dscr, 2),
        verdict=verdict,
        verdict_reason=verdict_reason,
        flags=flags,
    )
