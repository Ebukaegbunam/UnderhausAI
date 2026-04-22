import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.engine import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id:         Mapped[str]            = mapped_column(String(36), primary_key=True, default=_uuid)
    email:      Mapped[str]            = mapped_column(String, unique=True, nullable=False, index=True)
    name:       Mapped[Optional[str]]  = mapped_column(String, nullable=True)
    avatar_url: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    role:       Mapped[str]            = mapped_column(String, default="user", nullable=False)
    plan:       Mapped[str]            = mapped_column(String, default="free", nullable=False)

    # Soft delete — row is never removed
    is_deleted: Mapped[bool]               = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(
        "OAuthAccount", back_populates="user", lazy="selectin"
    )
    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession", back_populates="user"
    )

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.deleted_at = _now()


class OAuthAccount(Base):
    """
    One row per provider per user.
    Allows a user to link multiple providers to a single account.
    Never deleted even when the user is soft-deleted.
    """
    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_account"),
    )

    id:               Mapped[str]           = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id:          Mapped[str]           = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    provider:         Mapped[str]           = mapped_column(String(32), nullable=False)   # 'google' | 'github'
    provider_user_id: Mapped[str]           = mapped_column(String, nullable=False)
    provider_email:   Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at:       Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="oauth_accounts")


class UserSession(Base):
    """
    Tracks issued JWTs so we can revoke them on logout.
    jti (JWT ID) is the primary key — stored in every JWT payload.
    """
    __tablename__ = "user_sessions"

    jti:        Mapped[str]      = mapped_column(String(36), primary_key=True)
    user_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked:    Mapped[bool]     = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class Listing(Base):
    """
    Persisted Zillow listing. Upserted on every search so we accumulate inventory.
    zpid is the Zillow property ID — the natural unique key.
    """
    __tablename__ = "listings"

    zpid:          Mapped[str]           = mapped_column(String(36), primary_key=True)
    address:       Mapped[str]           = mapped_column(String, nullable=False, index=True)
    city:          Mapped[str]           = mapped_column(String, nullable=False)
    state:         Mapped[str]           = mapped_column(String(2), nullable=False)
    zip_code:      Mapped[str]           = mapped_column(String(10), nullable=False, index=True)

    price:         Mapped[Optional[int]] = mapped_column(nullable=True)
    beds:          Mapped[Optional[int]] = mapped_column(nullable=True)
    baths:         Mapped[Optional[float]] = mapped_column(nullable=True)
    sqft:          Mapped[Optional[int]] = mapped_column(nullable=True)
    lot_sqft:      Mapped[Optional[int]] = mapped_column(nullable=True)
    year_built:    Mapped[Optional[int]] = mapped_column(nullable=True)
    property_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    lat:           Mapped[Optional[float]] = mapped_column(nullable=True)
    lng:           Mapped[Optional[float]] = mapped_column(nullable=True)
    distance_miles: Mapped[Optional[float]] = mapped_column(nullable=True)

    zillow_url:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url:     Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    days_on_market:  Mapped[Optional[int]] = mapped_column(nullable=True)
    price_per_sqft:  Mapped[Optional[int]] = mapped_column(nullable=True)
    zestimate:       Mapped[Optional[int]] = mapped_column(nullable=True)
    rent_zestimate:  Mapped[Optional[int]] = mapped_column(nullable=True)
    hoa_fee:         Mapped[Optional[int]] = mapped_column(nullable=True)
    annual_tax:      Mapped[Optional[int]] = mapped_column(nullable=True)
    source:          Mapped[str]           = mapped_column(String(32), default="zillow", nullable=False)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
