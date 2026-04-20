import time
from typing import Any, Optional


class TTLCache:
    """Simple in-memory TTL cache. Swap for Redis when scaling."""

    def __init__(self, ttl_seconds: int = 3600):
        self._store: dict[str, tuple[Any, float]] = {}
        self.ttl = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.time() + self.ttl)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    def size(self) -> int:
        return len(self._store)


# Module-level singletons
listing_cache = TTLCache(ttl_seconds=3600)   # 1h — listing searches
geocode_cache = TTLCache(ttl_seconds=86400)  # 24h — geocode results don't change
