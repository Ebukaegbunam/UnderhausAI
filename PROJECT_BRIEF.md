# Underhaus AI — Project Brief

**Tagline:** *The foundation of every good deal.*
**One-liner:** An AI agent platform that does the real estate legwork for you — so you only see the deals that actually work.

---

## Vision

Underhaus AI is an AI-agent platform for real estate investment.

You tell it where you want to invest and what you can afford. Agents go out, pull the listings, run the numbers, enrich the analysis, and surface the deals worth looking at. Over time, those agents take on more of the full pre-purchase workflow — scraping, comping, analyzing, tracking, and eventually producing complete investment briefs with contacts, next steps, and negotiation leverage.

What starts as a fast underwriting engine becomes a team of agents working on your behalf.

---

## The Problem

Buying a small investment property in 2026 is still a spreadsheet-and-luck process.

Listings live on sites built for home-shoppers — Zillow shows you pretty kitchens, not cash flow. Investor tools like PropStream are aimed at full-time pros, cost $100+/mo, and assume you already know the questions. BiggerPockets gives you a community and a basic calculator but doesn't connect to live listings. Mashvisor tries but runs on stale data, dated UX, and pre-AI analysis.

The result: a new investor with $60K to deploy has to stitch together five tools and a custom spreadsheet, cold-call three realtors, and pray their math is right. Most never do it. The ones who do make expensive mistakes — overpaying, under-reserving, misreading rental potential, missing permit and zoning landmines.

There's a middle market of hundreds of thousands of people who *should* be buying real estate but aren't, because the information and underwriting infrastructure isn't built for them. That's the market.

---

## The Solution

Underhaus AI is a deal-discovery and underwriting platform for small investors — first-time house hackers through landlords with around twenty doors.

A user enters their financial profile once: down payment, credit range, target markets, investment goal (house hack, buy-and-hold, short-term rental). From that point on, Underhaus continuously scans listings across their markets, runs each one through their underwriting profile, enriches it with rental comps and neighborhood intelligence and financing options, and ranks the deals that actually cash flow.

When they find one, Underhaus hands them the contacts they need to act — investor-friendly realtors, multi-unit-friendly lenders, local PMs, inspectors who know older housing stock.

The AI agents aren't window dressing. They do the work that is genuinely hard without LLMs — rental estimation on weird multi-unit properties, photo-based condition analysis, permit and zoning synthesis, narrative deal briefs tailored to a specific buyer. This is work current tools do badly or not at all.

---

## Why Underhaus

Nobody else is using AI agents to do this work.

Mashvisor and PropStream are rule-based tools built before LLMs. BiggerPockets is a community with a calculator bolted on. Zillow was never built for investors. DealCheck is a glorified spreadsheet. The custom Excel model everyone actually uses doesn't scale past a handful of deals.

Underhaus is the first platform where agents — not users — do the work of finding, analyzing, and presenting deals. That's the wedge. Everything else follows from it.

---

## Target User

**Primary — The First-Time House Hacker.**
25–38, tech or professional worker, $80K–$200K income, $30K–$80K saved, hunting for their first multi-unit property in a mid-to-major US metro. Comfortable with financial concepts but not a professional investor. Lives on TikTok, Reddit, and BiggerPockets.

**Secondary — The Small Landlord Expanding.**
30–50, owns 1–8 doors, actively hunting their next acquisition, frustrated by existing tools. High LTV, low churn.

**Later expansion — Investor-Friendly Realtors.**
Agents who serve investor clients and need better tooling to do so. Different sales motion, companion product to the core offering.

---

## Product Evolution

Underhaus ships in three phases, each one enlarging what the agents do on your behalf.

### Phase 1 — The Underwriting Engine

You give Underhaus a zip code or an address. It pulls a set of real, current listings, runs each one through a stable underwriting engine using your financial profile, and returns them ranked by what actually makes sense to buy.

The math is honest — no generic defaults, no black-box numbers. Every assumption is visible and overridable. This phase proves the core loop: data in, ranked deals out. It's the foundation everything else rests on, and it's the first thing we ship.

### Phase 2 — Async Agent Scraping

Agents extend the engine's reach. Instead of relying on a single data source, agents fan out across listings sites, county records, rental comp databases, and permit systems — working in the background, notifying you when they finish. You come back to a richer, more complete picture of each property than the Phase 1 engine could produce alone.

This is where the product starts feeling alive. You're no longer hitting a button and waiting. Agents are working for you continuously.

### Phase 3 — The Full Agent Platform

Agents take on the full pre-purchase workflow. One agent analyzes listing photos for condition red flags. Another pulls zoning and permit history. Another benchmarks financing options across lenders. Another writes a narrative investment brief tailored to you. Another routes you to the right realtor, lender, or inspector in that market.

At this phase, Underhaus isn't a tool you open occasionally — it's a team working for you. This is the **$49.99/month** product. The value proposition is time: dozens of hours of research compressed into a ranked inbox of deals you can actually act on.

---

## Brand & Design Principles

**Name:** Underhaus AI. *"Under"* from underwriting, *"haus"* nodding to Bauhaus. The product is load-bearing, not decorative.

**Voice:** Confident, specific, numerate. Shows its work. Treats the user as an intelligent adult who can handle a real number. No "discover your dream property journey" marketing fluff.

**Visual:** Grid-based layouts. Typography does the heavy lifting — geometric sans for UI, editorial serif for hero headlines when we want warmth. Primary colors used as *signal*: green for positive cash flow, red for negative, nothing else competing. Generous whitespace. Everything on screen must be load-bearing.

**Taglines in rotation:**
- *The foundation of every good deal.* (primary)
- *Underwriting, without the spreadsheet.*
- *See the deal before you make the offer.*

---

## Non-Goals

What we explicitly won't build:

- A consumer home-shopping product competing with Zillow.
- A full transaction platform (we route to humans for offer, close, escrow).
- A property management or tenant-facing product (Stessa, Avail, and RentRedi own this; we'd rather integrate than compete).
- An iBuyer or any balance-sheet-heavy model.
- Features aimed at full-time institutional investors. The north star is the individual.
