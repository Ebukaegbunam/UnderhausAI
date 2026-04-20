import asyncio
import logging
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

logger = logging.getLogger(__name__)

_geocoder = Nominatim(user_agent="underhausai/1.0", timeout=10)


async def geocode(location: str) -> tuple[float, float, str]:
    """
    Resolves a zip code or address to (lat, lng, resolved_display_name).
    Raises ValueError with a user-readable message on failure.
    """
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None, lambda: _geocoder.geocode(location, addressdetails=True)
        )
    except GeocoderTimedOut:
        logger.error(f"Geocoder timed out for '{location}'")
        raise ValueError("Geocoding service timed out. Try again shortly.")
    except GeocoderServiceError as e:
        logger.error(f"Geocoder service error for '{location}': {e}")
        raise ValueError("Geocoding service unavailable. Try again shortly.")

    if result is None:
        raise ValueError(
            f"Could not locate '{location}'. "
            "Check the zip code or address and try again."
        )

    logger.info(f"Geocoded '{location}' → {result.latitude}, {result.longitude}")
    return result.latitude, result.longitude, result.address
