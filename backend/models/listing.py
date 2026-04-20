from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class PropertyType(str, Enum):
    multi_family = "MultiFamily"
    single_family = "SingleFamily"
    condo = "Condo"
    townhouse = "Townhouse"
    any = "All"


class StatusType(str, Enum):
    for_sale = "ForSale"
    for_rent = "ForRent"


class InvestmentGoal(str, Enum):
    house_hack = "house_hack"
    buy_and_hold = "buy_and_hold"
    short_term_rental = "short_term_rental"


class CreditRange(str, Enum):
    excellent = "760+"
    good = "720-759"
    fair = "680-719"
    below_fair = "below_680"


class UserProfile(BaseModel):
    down_payment_pct: float = Field(
        default=20.0, ge=3.5, le=50.0,
        description="Down payment as a percentage of purchase price"
    )
    annual_income: Optional[int] = Field(
        default=None, ge=0,
        description="Gross annual household income in dollars"
    )
    credit_range: CreditRange = Field(default=CreditRange.good)
    investment_goal: InvestmentGoal = Field(default=InvestmentGoal.buy_and_hold)
    # Monthly expenses the user already carries (for DTI calc)
    monthly_debt_payments: float = Field(
        default=0.0, ge=0,
        description="Existing monthly debt payments (car, student loans, etc.)"
    )
    # Overridable assumptions — defaults are conservative
    vacancy_rate_pct: float = Field(default=8.0, ge=0, le=50)
    management_fee_pct: float = Field(default=10.0, ge=0, le=20)
    maintenance_pct: float = Field(default=5.0, ge=0, le=20)
    capex_pct: float = Field(default=5.0, ge=0, le=20)
    insurance_annual: Optional[int] = Field(
        default=None,
        description="Annual insurance cost. If None, estimated at 0.5% of purchase price."
    )
    target_cash_on_cash_pct: float = Field(
        default=8.0, ge=0,
        description="Minimum acceptable cash-on-cash return to flag a deal as viable"
    )


class ListingSearchRequest(BaseModel):
    location: str = Field(..., description="Zip code or full address")
    radius_miles: float = Field(default=5.0, ge=0.1, le=50.0)
    property_types: List[PropertyType] = Field(default=[PropertyType.multi_family])
    status: StatusType = Field(default=StatusType.for_sale)
    min_price: Optional[int] = Field(default=None, ge=0)
    max_price: Optional[int] = Field(default=None, ge=0)
    min_beds: Optional[int] = Field(default=None, ge=1)
    max_results: int = Field(default=50, ge=1, le=200)
    user_profile: Optional[UserProfile] = Field(
        default=None,
        description="If provided, each listing will be run through underwriting"
    )


class Coordinates(BaseModel):
    lat: float
    lng: float


class Listing(BaseModel):
    zpid: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    price: Optional[int] = None
    beds: Optional[int] = None
    baths: Optional[float] = None
    sqft: Optional[int] = None
    lot_sqft: Optional[int] = None
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    distance_miles: Optional[float] = None
    zillow_url: Optional[str] = None
    image_url: Optional[str] = None
    days_on_market: Optional[int] = None
    price_per_sqft: Optional[int] = None
    zestimate: Optional[int] = None
    rent_zestimate: Optional[int] = None
    hoa_fee: Optional[int] = None
    annual_tax: Optional[int] = None
    source: str = "zillow"


class DataSourceStatus(str, Enum):
    ok = "ok"
    degraded = "degraded"
    error = "error"
    mock = "mock"


class ListingSearchResponse(BaseModel):
    center: Coordinates
    radius_miles: float
    location_resolved: str
    total_found: int
    listings: List["ListingWithUnderwriting"]
    data_source_status: DataSourceStatus
    error_detail: Optional[str] = None


# --- Underwriting models ---

class UnderwritingVerdict(str, Enum):
    go = "go"
    maybe = "maybe"
    no_go = "no_go"
    insufficient_data = "insufficient_data"


class UnderwritingResult(BaseModel):
    # Inputs used (all visible/overridable)
    purchase_price: int
    down_payment_dollars: int
    down_payment_pct: float
    loan_amount: int
    estimated_rate_pct: float
    loan_term_years: int = 30

    # Income
    estimated_monthly_rent: int
    rent_source: str  # "zestimate", "comp_estimate", or "user_override"

    # Expenses (monthly)
    mortgage_payment: float
    property_tax_monthly: float
    insurance_monthly: float
    vacancy_monthly: float
    management_monthly: float
    maintenance_monthly: float
    capex_monthly: float
    hoa_monthly: float
    total_expenses_monthly: float

    # Returns
    noi_annual: float
    cash_flow_monthly: float
    cash_on_cash_pct: float
    cap_rate_pct: float
    gross_rent_multiplier: float
    dscr: float

    # Verdict
    verdict: UnderwritingVerdict
    verdict_reason: str

    # Flags
    flags: List[str] = Field(default_factory=list)


class ListingWithUnderwriting(Listing):
    underwriting: Optional[UnderwritingResult] = None
