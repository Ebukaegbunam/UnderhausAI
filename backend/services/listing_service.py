"""
Listing persistence — upsert listings to Supabase after every Zillow fetch.
"""
import logging
import uuid
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import insert as sqlite_insert, select

from db.models import Listing as ListingRow
from models.listing import Listing

logger = logging.getLogger("underhaus.listings")


def _to_row(listing: Listing) -> dict:
    zpid = listing.zpid or str(uuid.uuid4())
    coords = listing.coordinates
    return {
        "zpid":           zpid,
        "address":        listing.address,
        "city":           listing.city,
        "state":          listing.state,
        "zip_code":       listing.zip_code,
        "price":          listing.price,
        "beds":           listing.beds,
        "baths":          listing.baths,
        "sqft":           listing.sqft,
        "lot_sqft":       listing.lot_sqft,
        "year_built":     listing.year_built,
        "property_type":  listing.property_type,
        "lat":            coords.lat if coords else None,
        "lng":            coords.lng if coords else None,
        "distance_miles": listing.distance_miles,
        "zillow_url":     listing.zillow_url,
        "image_url":      listing.image_url,
        "days_on_market": listing.days_on_market,
        "price_per_sqft": listing.price_per_sqft,
        "zestimate":      listing.zestimate,
        "rent_zestimate": listing.rent_zestimate,
        "hoa_fee":        listing.hoa_fee,
        "annual_tax":     listing.annual_tax,
        "source":         listing.source,
    }


async def upsert_listings(db: AsyncSession, listings: List[Listing]) -> None:
    if not listings:
        return

    rows = [_to_row(l) for l in listings]

    try:
        from db.engine import DATABASE_URL
        if "sqlite" in DATABASE_URL:
            # SQLite: insert-or-replace
            for row in rows:
                existing = await db.execute(
                    select(ListingRow).where(ListingRow.zpid == row["zpid"])
                )
                obj = existing.scalar_one_or_none()
                if obj:
                    for k, v in row.items():
                        if k != "zpid":
                            setattr(obj, k, v)
                else:
                    db.add(ListingRow(**row))
        else:
            # Postgres: proper upsert
            stmt = pg_insert(ListingRow).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["zpid"],
                set_={
                    "price":          stmt.excluded.price,
                    "days_on_market": stmt.excluded.days_on_market,
                    "zestimate":      stmt.excluded.zestimate,
                    "rent_zestimate": stmt.excluded.rent_zestimate,
                    "image_url":      stmt.excluded.image_url,
                    "last_seen_at":   stmt.excluded.last_seen_at,
                },
            )
            await db.execute(stmt)

        await db.commit()
        logger.info(f"Upserted {len(rows)} listings to Supabase")

    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to upsert listings: {e}")
