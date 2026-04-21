# UnderhausAI — API Specification

**Version:** 0.1.0  
**Last updated:** 2026-04-20  
**Base URL (local):** `http://localhost:8001`  
**Interactive docs:** `http://localhost:8001/docs` (live Swagger UI, always current)  
**OpenAPI JSON:** `http://localhost:8001/openapi.json`

---

## Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Request / Response Conventions](#request--response-conventions)
4. [Endpoints](#endpoints)
   - [Root](#root)
   - [Auth](#auth)
   - [Listings](#listings)
   - [Health](#health)
5. [TypeScript Types](#typescript-types)
6. [Error Handling](#error-handling)
7. [Frontend Integration Checklist](#frontend-integration-checklist)
8. [Changelog](#changelog)

---

## Quick Start

```bash
# Start backend
cd backend && python3 -m uvicorn main:app --reload --port 8001

# Confirm running
curl http://localhost:8001/
# → {"status":"ok","service":"UnderhausAI"}
```

The frontend is a React + Vite app at `http://localhost:5173`.  
The API client lives at `frontend/src/api/client.js` and reads `VITE_API_URL` from `.env.local`.

---

## Authentication

UnderhausAI uses **OAuth 2.0 (Google, GitHub)** — no email/password.  
After OAuth the backend issues a **JWT** which the frontend sends as a Bearer token.

### Flow

```
1. User clicks "Login with Google" or "Login with GitHub"

2. Frontend navigates to:
   GET http://localhost:8001/auth/google
   GET http://localhost:8001/auth/github

3. Backend redirects user to provider consent screen

4. Provider redirects back to:
   GET http://localhost:8001/auth/{provider}/callback?code=...

5. Backend exchanges code → gets user info → creates/finds user → issues JWT

6. Backend redirects to:
   http://localhost:5173/auth/callback?token=<jwt>

7. Frontend reads token from URL, stores it, redirects to app
```

### Storing the token

```ts
// On /auth/callback page
const params = new URLSearchParams(window.location.search)
const token = params.get('token')
if (token) {
  localStorage.setItem('uh_token', token)
  window.history.replaceState({}, '', '/') // remove token from URL
}
```

### Sending the token

Every authenticated request needs:
```
Authorization: Bearer <token>
```

```ts
const token = localStorage.getItem('uh_token')
fetch('/listings/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ ... }),
})
```

### Token expiry

Tokens expire after **60 minutes**. On a `401` response, clear the token and redirect to login.

---

## Request / Response Conventions

| Property | Value |
|----------|-------|
| Content-Type | `application/json` |
| Auth header | `Authorization: Bearer <token>` |
| Request ID | Every response includes `X-Request-ID` — use for bug reports |
| Latency | Every response includes `X-Latency-MS` — time the backend took |
| Base path | All endpoints at root, no `/api/v1` prefix yet |

---

## Endpoints

---

### Root

#### `GET /`

Liveness check. No auth required.

**Response `200`**
```json
{
  "status": "ok",
  "service": "UnderhausAI"
}
```

---

### Auth

#### `GET /auth/{provider}`

Redirects the user to the OAuth provider. Navigate the browser here — do not call via `fetch`.

**Path params**

| Param | Values |
|-------|--------|
| `provider` | `google` \| `github` |

**Response:** `302` redirect to provider consent screen.

**Usage:**
```ts
// Navigate the browser — not a fetch call
window.location.href = `${API_URL}/auth/google`
```

---

#### `GET /auth/{provider}/callback`

Called by the provider after the user grants access. Do not call directly.

**On success:** `302` redirect to `{FRONTEND_URL}/auth/callback?token=<jwt>`  
**On failure:** `302` redirect to `{FRONTEND_URL}/auth/error?reason=<reason>`

**Error reasons:**

| Reason | Meaning |
|--------|---------|
| `oauth_failed` | Provider rejected the code |
| `user_info_failed` | Could not fetch user profile from provider |
| `missing_user_info` | Provider did not return email or user ID |
| `account_deleted` | Account was previously soft-deleted |
| `unsupported_provider` | Provider not supported |

---

#### `GET /auth/me`

Returns the current authenticated user.

**Auth:** Required

**Response `200`**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Smith",
  "avatar_url": "https://...",
  "role": "user",
  "plan": "free"
}
```

**Response `401`** — not authenticated.

---

#### `DELETE /auth/session`

Logout — revokes the current JWT server-side. Token is invalid immediately after.

**Auth:** Required  
**Body:** none

**Response `200`**
```json
{ "status": "logged_out" }
```

---

#### `DELETE /auth/me`

Soft-deletes the account. The user's data is retained but the account is deactivated and all sessions are revoked.

**Auth:** Required  
**Body:** none

**Response `200`**
```json
{
  "status": "account_deleted",
  "message": "Your account has been deactivated. Your data is retained per our retention policy."
}
```

---

### Listings

#### `POST /listings/search`

Search for listings within a radius of a zip code or address.  
Optionally pass a `user_profile` to receive underwriting on every result.

**Auth:** Optional (unauth works, auth will unlock history in a future version)

**Request body**
```json
{
  "location": "60614",
  "radius_miles": 5,
  "property_types": ["MultiFamily"],
  "status": "ForSale",
  "min_price": null,
  "max_price": null,
  "min_beds": null,
  "max_results": 50,
  "user_profile": {
    "down_payment_pct": 20.0,
    "annual_income": 120000,
    "credit_range": "720-759",
    "investment_goal": "buy_and_hold",
    "monthly_debt_payments": 500,
    "vacancy_rate_pct": 8.0,
    "management_fee_pct": 10.0,
    "maintenance_pct": 5.0,
    "capex_pct": 5.0,
    "target_cash_on_cash_pct": 8.0
  }
}
```

**Field reference**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `location` | string | required | Zip code `"60614"` or full address `"2254 N Racine Ave, Chicago IL"` |
| `radius_miles` | float | `5.0` | Min `0.1`, max `50.0` |
| `property_types` | array | `["MultiFamily"]` | `"MultiFamily"` `"SingleFamily"` `"Condo"` `"Townhouse"` `"All"` |
| `status` | string | `"ForSale"` | `"ForSale"` or `"ForRent"` |
| `min_price` / `max_price` | int | null | Dollar amount |
| `min_beds` | int | null | Minimum bedrooms |
| `max_results` | int | `50` | 1–200 |
| `user_profile` | object | null | If omitted, underwriting is skipped |

**`user_profile` field reference**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `down_payment_pct` | float | `20.0` | 3.5–50% |
| `annual_income` | int | null | Gross household income |
| `credit_range` | string | `"720-759"` | `"760+"` `"720-759"` `"680-719"` `"below_680"` |
| `investment_goal` | string | `"buy_and_hold"` | `"buy_and_hold"` `"house_hack"` `"short_term_rental"` |
| `monthly_debt_payments` | float | `0` | Existing monthly debt (car, student loans) |
| `vacancy_rate_pct` | float | `8.0` | Override vacancy assumption |
| `management_fee_pct` | float | `10.0` | Override PM fee assumption |
| `maintenance_pct` | float | `5.0` | Override maintenance assumption |
| `capex_pct` | float | `5.0` | Override CapEx assumption |
| `target_cash_on_cash_pct` | float | `8.0` | Minimum CoC to flag a deal as `go` |

**Response `200`**
```json
{
  "center": { "lat": 41.923, "lng": -87.652 },
  "radius_miles": 5.0,
  "location_resolved": "60614, Lincoln Park, Chicago, IL...",
  "total_found": 33,
  "data_source_status": "ok",
  "error_detail": null,
  "listings": [
    {
      "zpid": "2128438063",
      "address": "2254 N Racine Ave",
      "city": "Chicago",
      "state": "IL",
      "zip_code": "60614",
      "price": 1530000,
      "beds": 7,
      "baths": 3.0,
      "sqft": null,
      "lot_sqft": null,
      "year_built": null,
      "property_type": "Multi Family",
      "coordinates": { "lat": 41.923, "lng": -87.658 },
      "distance_miles": 0.33,
      "zillow_url": "https://www.zillow.com/homedetails/...",
      "image_url": "https://photos.zillowstatic.com/...",
      "days_on_market": 12,
      "price_per_sqft": null,
      "zestimate": null,
      "rent_zestimate": null,
      "hoa_fee": null,
      "annual_tax": null,
      "source": "zillow",
      "underwriting": {
        "purchase_price": 1530000,
        "down_payment_dollars": 306000,
        "down_payment_pct": 20.0,
        "loan_amount": 1224000,
        "estimated_rate_pct": 7.0,
        "loan_term_years": 30,
        "estimated_monthly_rent": 10710,
        "rent_source": "price_estimate_0.7pct",
        "mortgage_payment": 8143.30,
        "property_tax_monthly": 1530.00,
        "insurance_monthly": 637.50,
        "vacancy_monthly": 856.80,
        "management_monthly": 1071.00,
        "maintenance_monthly": 535.50,
        "capex_monthly": 535.50,
        "hoa_monthly": 0.0,
        "total_expenses_monthly": 13309.60,
        "noi_annual": 66524.40,
        "cash_flow_monthly": -2599.60,
        "cash_on_cash_pct": -10.19,
        "cap_rate_pct": 4.35,
        "gross_rent_multiplier": 11.9,
        "dscr": 1.32,
        "verdict": "no_go",
        "verdict_reason": "Cash-on-cash of -10.2% is well below your 8% target...",
        "flags": [
          "Rent estimated from price (no Zillow rental data) — verify with local comps"
        ]
      }
    }
  ]
}
```

**`data_source_status` values**

| Value | Meaning | Frontend action |
|-------|---------|-----------------|
| `ok` | Live Zillow data | None |
| `mock` | Dev/test mock data | Show dev badge |
| `degraded` | Rate limited or partial results | Show warning banner |
| `error` | API unreachable | Show error state |

**`verdict` values**

| Value | Meaning | UI color |
|-------|---------|----------|
| `go` | Meets CoC target, DSCR healthy | Green |
| `maybe` | Close to target, worth investigating | Amber |
| `no_go` | Well below target | Red |
| `insufficient_data` | Can't underwrite — no rent data | Grey |

**Sorting:** When `user_profile` is provided, results are sorted `go → maybe → no_go → insufficient_data`, then by cash-on-cash descending. Without profile, sorted by distance ascending.

**Response `422`** — location not found or invalid input.
```json
{ "detail": "Could not locate 'ZZZNOTAPLACE'. Check the zip code or address." }
```

---

#### `GET /listings/property`

Fetch a single listing by address or Zillow URL with underwriting.

**Auth:** Optional

**Query params**

| Param | Type | Notes |
|-------|------|-------|
| `address` | string | e.g. `2254 N Racine Ave Chicago IL 60614` |
| `zillow_url` | string | Full Zillow listing URL — address extracted automatically |
| `down_payment_pct` | float | Default `20.0` |
| `credit_range` | string | Default `"720-759"` |
| `investment_goal` | string | Default `"buy_and_hold"` |
| `target_cash_on_cash_pct` | float | Default `8.0` |
| `annual_income` | int | Optional |
| `monthly_debt_payments` | float | Default `0` |

Provide either `address` OR `zillow_url` — not both required.

**Examples**
```
GET /listings/property?address=2254 N Racine Ave Chicago IL 60614
GET /listings/property?zillow_url=https://www.zillow.com/homedetails/2254-N-Racine-Ave.../12345_zpid/
```

**Response `200`** — same shape as a single listing in the search response (with `underwriting`).

**Response `404`** — property not found at that address.

**Response `422`** — neither `address` nor `zillow_url` provided.

---

### Health

#### `GET /health`

Liveness check. Returns instantly. Used by load balancers. No auth required.

**Response `200`**
```json
{ "status": "ok", "service": "UnderhausAI" }
```

---

#### `GET /health/report`

Full readiness check — pings all downstream services. Use this for dashboards.

**Response `200`**
```json
{
  "overall": "ok",
  "version": "0.1.0",
  "uptime_seconds": 3612.4,
  "checked_at": "2026-04-20T18:00:00Z",
  "started_at": "2026-04-20T17:00:00Z",
  "mock_mode": false,
  "request_id": "abc-123",
  "services": {
    "zillow": {
      "status": "ok",
      "latency_ms": 847,
      "detail": "API responding",
      "checked_at": "2026-04-20T18:00:00Z"
    },
    "geocoder": {
      "status": "ok",
      "latency_ms": 312,
      "detail": "Nominatim responding",
      "checked_at": "2026-04-20T18:00:00Z"
    }
  }
}
```

**`overall` values:** `ok` | `degraded` | `error` | `mock`

---

#### `POST /health/ping`

Cron-friendly health check. Accepts metadata, logs it, returns full report.  
Call every 2 hours from a monitoring system.

**Body** (all fields optional)
```json
{
  "source": "cron",
  "env": "production",
  "note": "scheduled 2h check"
}
```

**Response `200`** — same as `/health/report`.

**Cron example:**
```bash
curl -X POST https://your-api.com/health/ping \
  -H "Content-Type: application/json" \
  -d '{"source":"cron","env":"production"}'
```

---

## TypeScript Types

Copy these into your frontend. Keep in sync with the backend as features are added.

```ts
// --- Auth ---

export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  plan: 'free' | 'pro'
}

// --- Search ---

export type PropertyType = 'MultiFamily' | 'SingleFamily' | 'Condo' | 'Townhouse' | 'All'
export type StatusType = 'ForSale' | 'ForRent'
export type InvestmentGoal = 'buy_and_hold' | 'house_hack' | 'short_term_rental'
export type CreditRange = '760+' | '720-759' | '680-719' | 'below_680'
export type Verdict = 'go' | 'maybe' | 'no_go' | 'insufficient_data'
export type DataSourceStatus = 'ok' | 'mock' | 'degraded' | 'error'

export interface UserProfile {
  down_payment_pct: number          // default 20
  annual_income?: number
  credit_range: CreditRange         // default '720-759'
  investment_goal: InvestmentGoal   // default 'buy_and_hold'
  monthly_debt_payments?: number    // default 0
  vacancy_rate_pct?: number         // default 8
  management_fee_pct?: number       // default 10
  maintenance_pct?: number          // default 5
  capex_pct?: number                // default 5
  target_cash_on_cash_pct?: number  // default 8
}

export interface ListingSearchRequest {
  location: string
  radius_miles?: number             // default 5
  property_types?: PropertyType[]   // default ['MultiFamily']
  status?: StatusType               // default 'ForSale'
  min_price?: number
  max_price?: number
  min_beds?: number
  max_results?: number              // default 50, max 200
  user_profile?: UserProfile
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface UnderwritingResult {
  purchase_price: number
  down_payment_dollars: number
  down_payment_pct: number
  loan_amount: number
  estimated_rate_pct: number
  loan_term_years: number
  estimated_monthly_rent: number
  rent_source: string
  mortgage_payment: number
  property_tax_monthly: number
  insurance_monthly: number
  vacancy_monthly: number
  management_monthly: number
  maintenance_monthly: number
  capex_monthly: number
  hoa_monthly: number
  total_expenses_monthly: number
  noi_annual: number
  cash_flow_monthly: number
  cash_on_cash_pct: number
  cap_rate_pct: number
  gross_rent_multiplier: number
  dscr: number
  verdict: Verdict
  verdict_reason: string
  flags: string[]
}

export interface Listing {
  zpid: string | null
  address: string
  city: string
  state: string
  zip_code: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  lot_sqft: number | null
  year_built: number | null
  property_type: string | null
  coordinates: Coordinates | null
  distance_miles: number | null
  zillow_url: string | null
  image_url: string | null
  days_on_market: number | null
  price_per_sqft: number | null
  zestimate: number | null
  rent_zestimate: number | null
  hoa_fee: number | null
  annual_tax: number | null
  source: string
  underwriting: UnderwritingResult | null
}

export interface ListingSearchResponse {
  center: Coordinates
  radius_miles: number
  location_resolved: string
  total_found: number
  listings: Listing[]
  data_source_status: DataSourceStatus
  error_detail: string | null
}

// --- Health ---

export interface ServiceCheck {
  status: string
  latency_ms: number
  detail: string
  checked_at: string
}

export interface HealthReport {
  overall: string
  version: string
  uptime_seconds: number
  checked_at: string
  started_at: string
  mock_mode: boolean
  services: Record<string, ServiceCheck>
}
```

---

## Error Handling

### HTTP status codes

| Code | Meaning | When it happens |
|------|---------|-----------------|
| `200` | OK | Success |
| `302` | Redirect | OAuth flows |
| `400` | Bad Request | Malformed request |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Valid token but wrong role |
| `404` | Not Found | Property/resource not found |
| `422` | Unprocessable | Validation error (bad input) — body contains `detail` |
| `429` | Rate Limited | Too many requests to Zillow API |
| `500` | Server Error | Unexpected backend failure |
| `502` | Bad Gateway | Upstream (Zillow) error |

### Error body shape

```json
{ "detail": "Human-readable error message" }
```

### Error tags in logs

Every error emitted by the backend has a traceable tag in `X-Request-ID` — share this with the backend team when reporting issues.

| Tag | Meaning |
|-----|---------|
| `UH-GEO-001` | Geocoder timeout |
| `UH-GEO-003` | Location not found |
| `UH-ZIL-001` | Zillow API timeout |
| `UH-ZIL-002` | Zillow rate limited |
| `UH-ZIL-003` | Zillow key rejected |
| `UH-AUTH-001` | OAuth provider error |
| `UH-AUTH-002` | User info fetch failed |
| `UH-REQ-001` | Client error |
| `UH-REQ-002` | Server error |

### Recommended frontend error handling

```ts
async function apiCall<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options)

  if (res.status === 401) {
    localStorage.removeItem('uh_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }

  return res.json()
}
```

---

## Frontend Integration Checklist

### Auth pages needed

- [ ] `/login` — "Continue with Google" + "Continue with GitHub" buttons
- [ ] `/auth/callback` — reads `?token=` from URL, stores it, redirects to `/`
- [ ] `/auth/error` — reads `?reason=` from URL, shows appropriate message
- [ ] Account deletion confirmation modal → calls `DELETE /auth/me`

### Search flow

- [ ] Search form: location input + radius slider + property type checkboxes
- [ ] User profile form: down payment %, credit range, investment goal, target CoC
- [ ] Results list: sorted by verdict, each card shows price, cash flow, verdict badge
- [ ] Each result card links to Zillow URL
- [ ] `data_source_status === 'degraded'` → show warning banner at top of results
- [ ] `data_source_status === 'error'` → show error state, no results

### Underwriting display

- [ ] Verdict badge: green (`go`), amber (`maybe`), red (`no_go`), grey (`insufficient_data`)
- [ ] Cash flow: green if positive, red if negative
- [ ] Expandable expense breakdown showing all line items
- [ ] Flags list below the numbers
- [ ] `rent_source` shown as a footnote: "Rent estimated from price — verify with local comps"

### Observability

- [ ] Log `X-Request-ID` header on every API error so users can report it to support

---

## Changelog

### 2026-04-20 — v0.1.0

**Added**
- `POST /listings/search` — Zillow listing search by zip or address + radius
- `GET /listings/property` — single listing lookup by address or Zillow URL
- Full underwriting engine on every listing: mortgage, expenses, CoC, cap rate, GRM, DSCR, verdict
- `GET /auth/google`, `GET /auth/github` — OAuth login
- `GET /auth/me`, `DELETE /auth/session`, `DELETE /auth/me`
- `GET /health`, `GET /health/report`, `POST /health/ping`
- `X-Request-ID` and `X-Latency-MS` on every response
- Soft-delete pattern: `DELETE /auth/me` marks user as deleted, never removes data

**Data sources**
- Zillow listings via letsscrape RapidAPI (`real-estate-zillow-com.p.rapidapi.com`)
- Geocoding via Nominatim (OpenStreetMap)
