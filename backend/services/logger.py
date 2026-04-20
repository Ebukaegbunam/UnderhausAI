"""
Structured JSON logger for UnderhausAI.

Every log line is a JSON object — easy to parse in any log aggregator (Datadog, Loki, CloudWatch).
Every error gets a traceable tag in the format: UH-{SERVICE}-{CODE}

Error tag registry:
  UH-GEO-001   Geocoder timeout
  UH-GEO-002   Geocoder service error
  UH-GEO-003   Location not found
  UH-ZIL-001   Zillow API timeout
  UH-ZIL-002   Zillow rate limited (429)
  UH-ZIL-003   Zillow key rejected (403)
  UH-ZIL-004   Zillow blocked by anti-bot (500)
  UH-ZIL-005   Zillow parse error
  UH-ZIL-006   Zillow network error
  UH-UW-001    Underwriting: missing price data
  UH-REQ-001   Validation error (bad request)
  UH-REQ-002   Internal server error
  UH-CFG-001   Missing API key / config
"""
import json
import logging
import sys
import time
from datetime import datetime, timezone
from typing import Optional


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log: dict = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        # Attach any extra fields passed via logger.info("msg", extra={...})
        for key in ("request_id", "method", "path", "status", "latency_ms",
                    "error_tag", "service", "zpid", "location", "user_id"):
            val = getattr(record, key, None)
            if val is not None:
                log[key] = val

        if record.exc_info:
            log["exc"] = self.formatException(record.exc_info)

        return json.dumps(log)


def setup_logging(level: str = "INFO") -> None:
    """Call once at startup to configure root and app loggers."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Quieten noisy libraries
    for noisy in ("uvicorn.access", "httpx", "geopy"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


# --- Error tag helpers ---

class ErrorTag:
    """Namespace for all UnderhausAI error tags."""
    # Geocoder
    GEO_TIMEOUT       = "UH-GEO-001"
    GEO_SERVICE_ERROR = "UH-GEO-002"
    GEO_NOT_FOUND     = "UH-GEO-003"
    # Zillow
    ZIL_TIMEOUT       = "UH-ZIL-001"
    ZIL_RATE_LIMITED  = "UH-ZIL-002"
    ZIL_KEY_REJECTED  = "UH-ZIL-003"
    ZIL_BLOCKED       = "UH-ZIL-004"
    ZIL_PARSE_ERROR   = "UH-ZIL-005"
    ZIL_NETWORK       = "UH-ZIL-006"
    # Underwriting
    UW_MISSING_PRICE  = "UH-UW-001"
    # Request
    REQ_VALIDATION    = "UH-REQ-001"
    REQ_INTERNAL      = "UH-REQ-002"
    # Config
    CFG_MISSING_KEY   = "UH-CFG-001"


def log_error(
    logger: logging.Logger,
    msg: str,
    tag: str,
    request_id: Optional[str] = None,
    **extra,
) -> None:
    """Log an error with a traceable tag and optional context."""
    logger.error(
        msg,
        extra={"error_tag": tag, "request_id": request_id, **extra},
    )
