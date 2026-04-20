"""
Tests for the underwriting engine.
All tests run without any external API calls.
"""
import pytest
from models.listing import (
    Listing, Coordinates, UserProfile,
    InvestmentGoal, CreditRange, UnderwritingVerdict,
)
from agents.underwriting_engine import underwrite, _monthly_mortgage


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_listing(**overrides) -> Listing:
    defaults = dict(
        zpid="test-001",
        address="123 Main St",
        city="Chicago",
        state="IL",
        zip_code="60614",
        price=450000,
        beds=6,
        baths=3.0,
        sqft=2800,
        property_type="Multi Family",
        coordinates=Coordinates(lat=41.92, lng=-87.65),
        distance_miles=1.2,
        rent_zestimate=3800,
        annual_tax=8550,
        hoa_fee=0,
    )
    return Listing(**{**defaults, **overrides})


def default_profile(**overrides) -> UserProfile:
    defaults = dict(
        down_payment_pct=20.0,
        annual_income=120000,
        credit_range=CreditRange.good,
        investment_goal=InvestmentGoal.buy_and_hold,
        monthly_debt_payments=500,
        vacancy_rate_pct=8.0,
        management_fee_pct=10.0,
        maintenance_pct=5.0,
        capex_pct=5.0,
        target_cash_on_cash_pct=8.0,
    )
    return UserProfile(**{**defaults, **overrides})


# ---------------------------------------------------------------------------
# Mortgage calculator
# ---------------------------------------------------------------------------

def test_mortgage_basic():
    # $360k loan, 7%, 30yr → ~$2,395/mo
    payment = _monthly_mortgage(360000, 7.0, 30)
    assert 2380 < payment < 2420


def test_mortgage_zero_rate():
    payment = _monthly_mortgage(360000, 0.0, 30)
    assert abs(payment - 1000.0) < 1


# ---------------------------------------------------------------------------
# Core underwriting
# ---------------------------------------------------------------------------

def test_underwrite_returns_result():
    listing = make_listing()
    profile = default_profile()
    result = underwrite(listing, profile)
    assert result is not None


def test_underwrite_no_price_returns_none():
    listing = make_listing(price=None)
    result = underwrite(listing, default_profile())
    assert result is None


def test_underwrite_uses_rent_zestimate():
    listing = make_listing(rent_zestimate=4000)
    result = underwrite(listing, default_profile())
    assert result.estimated_monthly_rent == 4000
    assert result.rent_source == "zestimate"


def test_underwrite_falls_back_to_price_estimate():
    listing = make_listing(rent_zestimate=None)
    result = underwrite(listing, default_profile())
    assert result.estimated_monthly_rent == int(450000 * 0.007)
    assert "price_estimate" in result.rent_source


def test_total_expenses_components_sum():
    listing = make_listing()
    result = underwrite(listing, default_profile())
    component_sum = round(
        result.mortgage_payment
        + result.property_tax_monthly
        + result.insurance_monthly
        + result.vacancy_monthly
        + result.management_monthly
        + result.maintenance_monthly
        + result.capex_monthly
        + result.hoa_monthly,
        2,
    )
    assert abs(component_sum - result.total_expenses_monthly) < 0.02


def test_cash_flow_is_rent_minus_expenses():
    listing = make_listing()
    result = underwrite(listing, default_profile())
    expected = round(result.estimated_monthly_rent - result.total_expenses_monthly, 2)
    assert abs(result.cash_flow_monthly - expected) < 0.02


def test_cash_on_cash_formula():
    listing = make_listing()
    profile = default_profile()
    result = underwrite(listing, profile)
    down = 450000 * 0.20
    expected_coc = round((result.cash_flow_monthly * 12) / down * 100, 2)
    assert abs(result.cash_on_cash_pct - expected_coc) < 0.05


def test_dscr_formula():
    listing = make_listing()
    result = underwrite(listing, default_profile())
    expected_dscr = round(result.estimated_monthly_rent / result.mortgage_payment, 2)
    assert abs(result.dscr - expected_dscr) < 0.01


# ---------------------------------------------------------------------------
# Verdicts
# ---------------------------------------------------------------------------

def test_verdict_go_when_coc_meets_target():
    # High rent zestimate → strong cash-on-cash → GO
    listing = make_listing(price=300000, rent_zestimate=4500)
    profile = default_profile(target_cash_on_cash_pct=8.0)
    result = underwrite(listing, profile)
    assert result.verdict == UnderwritingVerdict.go


def test_verdict_no_go_when_overpriced():
    # Very high price relative to rent → NO GO
    listing = make_listing(price=1_200_000, rent_zestimate=2000)
    result = underwrite(listing, default_profile(target_cash_on_cash_pct=8.0))
    assert result.verdict == UnderwritingVerdict.no_go


def test_verdict_insufficient_data_no_rent():
    listing = make_listing(price=400000, rent_zestimate=None)
    # Hack: zero out the beds so the price-based estimate also returns 0
    listing = make_listing(price=None)
    result = underwrite(listing, default_profile())
    assert result is None  # no price → None, not insufficient_data


def test_verdict_insufficient_data_when_rent_zero():
    # rent_zestimate=0 triggers price-based fallback; price=1 → floor rent = 0 → insufficient_data
    listing = make_listing(price=1, rent_zestimate=0)
    result = underwrite(listing, default_profile())
    assert result.verdict == UnderwritingVerdict.insufficient_data


def test_rent_zestimate_zero_falls_back_to_price_estimate():
    # When Zillow gives rent_zestimate=0, engine falls back to 0.7% price rule
    listing = make_listing(price=400000, rent_zestimate=0)
    result = underwrite(listing, default_profile())
    assert result.estimated_monthly_rent == int(400000 * 0.007)
    assert "price_estimate" in result.rent_source


# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------

def test_flag_stale_listing():
    listing = make_listing(days_on_market=90)
    result = underwrite(listing, default_profile())
    assert any("90 days" in f for f in result.flags)


def test_flag_old_building():
    listing = make_listing(year_built=1940)
    result = underwrite(listing, default_profile())
    assert any("1940" in f for f in result.flags)


def test_flag_hoa():
    listing = make_listing(hoa_fee=350)
    result = underwrite(listing, default_profile())
    assert any("HOA" in f for f in result.flags)
    assert result.hoa_monthly == 350.0


# ---------------------------------------------------------------------------
# House hack adjustment
# ---------------------------------------------------------------------------

def test_house_hack_reduces_rent():
    listing = make_listing(beds=6, rent_zestimate=4800)
    profile_hh = default_profile(investment_goal=InvestmentGoal.house_hack)
    profile_bh = default_profile(investment_goal=InvestmentGoal.buy_and_hold)
    result_hh = underwrite(listing, profile_hh)
    result_bh = underwrite(listing, profile_bh)
    assert result_hh.estimated_monthly_rent < result_bh.estimated_monthly_rent


# ---------------------------------------------------------------------------
# FHA rate
# ---------------------------------------------------------------------------

def test_fha_rate_lower_than_conventional_for_house_hack():
    listing = make_listing()
    profile_hh = default_profile(
        investment_goal=InvestmentGoal.house_hack,
        down_payment_pct=5.0,
        credit_range=CreditRange.good,
    )
    profile_bh = default_profile(
        investment_goal=InvestmentGoal.buy_and_hold,
        down_payment_pct=5.0,
        credit_range=CreditRange.good,
    )
    result_hh = underwrite(listing, profile_hh)
    result_bh = underwrite(listing, profile_bh)
    assert result_hh.estimated_rate_pct <= result_bh.estimated_rate_pct
