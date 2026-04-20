"""
Health routes.

GET  /health         — quick liveness check (used by load balancers, uptime monitors)
GET  /health/report  — detailed readiness check for cron jobs and dashboards
POST /health/ping    — cron-friendly endpoint: accepts custom metadata, returns full report

Cron job usage (every 2 hours):
  curl -X POST https://your-api/health/ping \
    -H "Content-Type: application/json" \
    -d '{"source": "cron", "env": "production", "note": "scheduled check"}'
"""
import os
import time
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("underhaus.health")

router = APIRouter(prefix="/health", tags=["health"])

# Track startup time for uptime reporting
_STARTUP_TIME = time.monotonic()
_STARTUP_TS   = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ServiceCheck(BaseModel):
    status: str           # "ok" | "degraded" | "error" | "mock"
    latency_ms: float
    detail: str
    checked_at: str


class HealthReport(BaseModel):
    overall: str
    version: str
    uptime_seconds: float
    checked_at: str
    started_at: str
    mock_mode: bool
    services: dict[str, ServiceCheck]
    request_id: Optional[str] = None


class PingRequest(BaseModel):
    source: Optional[str] = None    # e.g. "cron", "monitoring", "manual"
    env: Optional[str] = None       # e.g. "production", "staging"
    note: Optional[str] = None      # free-text context


# ---------------------------------------------------------------------------
# Core check logic (shared between routes)
# ---------------------------------------------------------------------------

async def _run_checks() -> tuple[dict[str, ServiceCheck], bool]:
    mock_mode = os.getenv("ZILLOW_MOCK_MODE", "false").lower() == "true"
    api_key   = os.getenv("RAPIDAPI_KEY", "").strip()
    checks: dict[str, ServiceCheck] = {}
    now = datetime.now(timezone.utc).isoformat()

    # --- Zillow ---
    if mock_mode:
        checks["zillow"] = ServiceCheck(
            status="mock", latency_ms=0,
            detail="Mock mode active — no live API calls", checked_at=now,
        )
    elif not api_key:
        checks["zillow"] = ServiceCheck(
            status="error", latency_ms=0,
            detail="RAPIDAPI_KEY not set in .env [UH-CFG-001]", checked_at=now,
        )
    else:
        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://real-estate-zillow-com.p.rapidapi.com/v1/autocomplete",
                    headers={
                        "x-rapidapi-host": "real-estate-zillow-com.p.rapidapi.com",
                        "x-rapidapi-key": api_key,
                    },
                    params={"query": "60614"},
                )
            latency = round((time.monotonic() - t0) * 1000)

            if resp.status_code == 200:
                checks["zillow"] = ServiceCheck(status="ok", latency_ms=latency, detail="API responding", checked_at=now)
            elif resp.status_code == 429:
                checks["zillow"] = ServiceCheck(status="degraded", latency_ms=latency, detail="Rate limited [UH-ZIL-002]", checked_at=now)
            elif resp.status_code == 403:
                checks["zillow"] = ServiceCheck(status="error", latency_ms=latency, detail="Key rejected (403) [UH-ZIL-003]", checked_at=now)
            else:
                checks["zillow"] = ServiceCheck(status="degraded", latency_ms=latency, detail=f"Unexpected {resp.status_code}", checked_at=now)
        except httpx.TimeoutException:
            checks["zillow"] = ServiceCheck(status="degraded", latency_ms=8000, detail="Timed out [UH-ZIL-001]", checked_at=now)
        except Exception as e:
            checks["zillow"] = ServiceCheck(status="error", latency_ms=0, detail=f"Error: {e} [UH-ZIL-006]", checked_at=now)

    # --- Geocoder ---
    t0 = time.monotonic()
    try:
        from services.geocoder import geocode
        await geocode("60614")
        latency = round((time.monotonic() - t0) * 1000)
        checks["geocoder"] = ServiceCheck(status="ok", latency_ms=latency, detail="Nominatim responding", checked_at=now)
    except ValueError as e:
        latency = round((time.monotonic() - t0) * 1000)
        checks["geocoder"] = ServiceCheck(status="error", latency_ms=latency, detail=f"{e} [UH-GEO-003]", checked_at=now)
    except Exception as e:
        latency = round((time.monotonic() - t0) * 1000)
        checks["geocoder"] = ServiceCheck(status="error", latency_ms=latency, detail=f"{e} [UH-GEO-002]", checked_at=now)

    return checks, mock_mode


def _overall_status(checks: dict[str, ServiceCheck]) -> str:
    statuses = {c.status for c in checks.values()}
    if "error" in statuses:
        return "error"
    if "degraded" in statuses:
        return "degraded"
    if statuses == {"mock"}:
        return "mock"
    return "ok"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", summary="Liveness check")
async def liveness():
    """Quick check — returns 200 if the server is up. Used by load balancers."""
    return {"status": "ok", "service": "UnderhausAI"}


@router.get("/report", response_model=HealthReport, summary="Full readiness report")
async def health_report(request: Request):
    """
    Detailed health check. Pings all downstream services.
    Returns latency per service, uptime, and error tags on any failure.
    """
    checks, mock_mode = await _run_checks()
    report = HealthReport(
        overall=_overall_status(checks),
        version=os.getenv("APP_VERSION", "0.1.0"),
        uptime_seconds=round(time.monotonic() - _STARTUP_TIME, 1),
        checked_at=datetime.now(timezone.utc).isoformat(),
        started_at=_STARTUP_TS,
        mock_mode=mock_mode,
        services=checks,
        request_id=getattr(request.state, "request_id", None),
    )

    logger.info(
        "Health report generated",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "overall": report.overall,
            "services": {k: v.status for k, v in checks.items()},
        },
    )

    return report


@router.post("/ping", response_model=HealthReport, summary="Cron-friendly health ping")
async def health_ping(request: Request, body: PingRequest = PingRequest()):
    """
    Accepts a ping from a cron job or monitoring system.
    Runs all service checks and returns a full report.
    Log line includes source/env/note for traceability.

    Call every 2 hours from a cron job:
      curl -X POST /health/ping -d '{"source":"cron","env":"production"}'
    """
    checks, mock_mode = await _run_checks()
    report = HealthReport(
        overall=_overall_status(checks),
        version=os.getenv("APP_VERSION", "0.1.0"),
        uptime_seconds=round(time.monotonic() - _STARTUP_TIME, 1),
        checked_at=datetime.now(timezone.utc).isoformat(),
        started_at=_STARTUP_TS,
        mock_mode=mock_mode,
        services=checks,
        request_id=getattr(request.state, "request_id", None),
    )

    logger.info(
        "Health ping received",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "source": body.source or "unknown",
            "env": body.env or "unknown",
            "note": body.note,
            "overall": report.overall,
        },
    )

    if report.overall in ("error", "degraded"):
        logger.warning(
            f"Health degraded — overall={report.overall}",
            extra={
                "error_tag": "UH-HEALTH-001",
                "failing_services": [k for k, v in checks.items() if v.status in ("error", "degraded")],
            },
        )

    return report
