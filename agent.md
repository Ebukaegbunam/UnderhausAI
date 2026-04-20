# agent.md — Underhaus AI Agent Architecture

This file defines the agents in the Underhaus AI platform — what they do, what they need, and how they fit into the product phases defined in `PROJECT_BRIEF.md`.

---

## Agent Philosophy

Agents in Underhaus do the work the user would otherwise do manually:
- Fetch and normalize listing data
- Run underwriting calculations against a user's financial profile
- Enrich properties with rental comps, permit history, zoning info
- Produce ranked, readable output the user can act on

Agents are not decorative. Every agent must produce something a user would have had to do themselves in a spreadsheet or by making phone calls.

---

## Phase 1 Agents — Underwriting Engine

These agents power the core loop: address/zip in → ranked deals out.

### `listing_agent`
**Role:** Fetch current listings for a target market.
**Input:** Zip code or city/state, property type filter (multi-unit, SFR, etc.), price range.
**Output:** List of normalized listing objects with address, price, beds/baths, sqft, list date, source URL.
**Data sources (planned):** Zillow scrape, RapidAPI listing feeds, or MLS bridge.

### `underwriting_agent`
**Role:** Run each listing through the user's financial profile and return key metrics.
**Input:** Listing object + user profile (down payment %, credit range, target ROI, investment goal).
**Output per listing:**
- Estimated monthly rent (gross)
- Estimated monthly expenses (taxes, insurance, vacancy, maintenance, CapEx, PM if applicable)
- Net operating income (NOI)
- Cash-on-cash return
- Monthly cash flow
- DSCR (debt service coverage ratio)
- Go / No-go flag with one-line rationale
**Key rule:** All assumptions must be surfaced — no black-box numbers. Users can override any input.

### `comp_agent`
**Role:** Pull rental comps for a given address to validate rent estimates.
**Input:** Address, property type, bed/bath count.
**Output:** 3–5 comparable rental listings with rent, distance, and similarity score.
**Data sources (planned):** Rentcast API, Zillow rental listings, AirDNA (for STR).

---

## Phase 2 Agents — Async Enrichment

These agents run in the background after Phase 1 surfaces a deal worth looking at.

### `permit_agent`
**Role:** Pull permit and violation history for a property.
**Input:** Address.
**Output:** Open permits, closed permit history (major work done), code violations, estimated permit risk flag.
**Data sources (planned):** County assessor APIs, OpenPermit, manual scrape fallback.

### `zoning_agent`
**Role:** Confirm legal use, unit count, and expansion potential.
**Input:** Address.
**Output:** Zoning classification, allowed uses, current legal unit count, ADU eligibility, notes on restrictions.
**Data sources (planned):** County GIS APIs, Regrid, Zoneomics.

### `neighborhood_agent`
**Role:** Enrich a listing with neighborhood-level context relevant to investors.
**Input:** Address or zip code.
**Output:** Rent trend (12-month), vacancy rate, crime index, school rating, walkability score, investor activity level.
**Data sources (planned):** Census API, GreatSchools, Walk Score API, local MLS activity.

---

## Phase 3 Agents — Full Pre-Purchase Workflow

### `photo_agent`
**Role:** Analyze listing photos for condition signals and red flags.
**Input:** Listing photo URLs.
**Output:** Condition score, flagged issues (deferred maintenance, foundation cracks, water damage, roof age signals), confidence level.
**Model:** Claude vision or GPT-4o vision call with structured output.

### `financing_agent`
**Role:** Model financing options across lender types for a given deal.
**Input:** Purchase price, user down payment, credit range, investment goal.
**Output:** Side-by-side comparison of conventional, FHA (if house hack), DSCR loan, and hard money — with monthly payment, rate assumption, and qualification notes.

### `brief_agent`
**Role:** Write a narrative investment brief for a specific property tailored to the user's profile.
**Input:** All enriched data from above agents + user profile.
**Output:** 1–2 page markdown brief covering: deal summary, underwriting snapshot, risk flags, comp validation, financing options, recommended next steps.
**Model:** Claude claude-sonnet-4-6 with structured prompt, rendered in the UI as a formatted card.

### `contact_agent`
**Role:** Surface the right humans to act on a deal in a specific market.
**Input:** Address/market + investment goal (house hack, buy-and-hold, STR).
**Output:** Investor-friendly realtors, multi-unit lenders, local property managers, inspectors — with contact info and investor-specific notes.
**Data sources (planned):** BiggerPockets agent directory, curated partner list, user-submitted recommendations.

---

## Agent Runtime (Planned)

- Phase 1 agents run synchronously per user request (target < 10s response)
- Phase 2/3 agents run async — job queued, user notified on completion
- All agent calls go through the FastAPI backend — frontend never calls external APIs directly
- Agent results cached per property per 24h to reduce redundant API calls
- LLM calls (brief_agent, photo_agent) use Claude via Anthropic SDK with prompt caching enabled

---

## Adding a New Agent

1. Define it in this file under the appropriate phase
2. Create `backend/agents/<agent_name>.py` with a single async function that matches the input/output spec above
3. Add a route in `backend/main.py` that calls it
4. Update memory with what was added and why
