"""
Request tracking middleware.

For every HTTP request:
  - Assigns a unique request ID (UUID) — also returned as X-Request-ID response header
  - Logs method, path, status code, and latency in ms
  - Attaches request_id to the request state so downstream handlers can use it
  - Logs slow requests (> 3000ms) at WARNING level
"""
import time
import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("underhaus.request")

SLOW_REQUEST_MS = 3000  # warn if request takes longer than this
_SILENT_PATHS = {"/health", "/", "/favicon.ico"}  # suppress success logs for these


class RequestTrackerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.monotonic()

        try:
            response = await call_next(request)
        except Exception as exc:
            latency_ms = round((time.monotonic() - start) * 1000)
            logger.error(
                "Unhandled exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "latency_ms": latency_ms,
                    "error_tag": "UH-REQ-002",
                },
                exc_info=exc,
            )
            raise

        latency_ms = round((time.monotonic() - start) * 1000)
        status = response.status_code

        log_extra = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": status,
            "latency_ms": latency_ms,
        }

        if latency_ms > SLOW_REQUEST_MS:
            logger.warning("Slow request", extra={**log_extra, "error_tag": "UH-PERF-001"})
        elif status >= 500:
            logger.error("Server error response", extra={**log_extra, "error_tag": "UH-REQ-002"})
        elif status >= 400:
            logger.warning("Client error response", extra={**log_extra, "error_tag": "UH-REQ-001"})
        elif request.url.path not in _SILENT_PATHS:
            logger.info("Request completed", extra=log_extra)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Latency-MS"] = str(latency_ms)
        return response
