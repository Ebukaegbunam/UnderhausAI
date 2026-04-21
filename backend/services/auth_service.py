"""
Auth service — JWT creation/validation and user lifecycle.
"""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.models import User, OAuthAccount, UserSession

logger = logging.getLogger("underhaus.auth")

JWT_SECRET    = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION_USE_32+_CHARS")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(user: User) -> tuple[str, str]:
    """
    Returns (jwt_token, jti).
    jti is stored in user_sessions for revocation.
    """
    jti = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub":   user.id,
        "email": user.email,
        "role":  user.role,
        "jti":   jti,
        "exp":   expires,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, jti


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT. Raises JWTError on failure."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

async def save_session(db: AsyncSession, user_id: str, jti: str) -> None:
    session = UserSession(
        jti=jti,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
    )
    db.add(session)
    await db.commit()


async def revoke_session(db: AsyncSession, jti: str) -> None:
    result = await db.execute(
        select(UserSession).where(UserSession.jti == jti)
    )
    session = result.scalar_one_or_none()
    if session:
        session.revoked = True
        await db.commit()
        logger.info("Session revoked", extra={"jti": jti})


async def is_session_valid(db: AsyncSession, jti: str) -> bool:
    result = await db.execute(
        select(UserSession).where(
            UserSession.jti == jti,
            UserSession.revoked == False,  # noqa: E712
            UserSession.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none() is not None


# ---------------------------------------------------------------------------
# User lifecycle
# ---------------------------------------------------------------------------

async def get_or_create_user(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
    email: str,
    name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> User:
    """
    Find or create a user from an OAuth callback.

    Logic:
      1. If an OAuthAccount exists for this provider+id → return that user
      2. Else if a non-deleted user with this email exists → link the new provider to them
      3. Else → create a new user and oauth_account
    """
    # 1. Existing OAuth account
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == str(provider_user_id),
        )
    )
    existing_oauth = result.scalar_one_or_none()

    if existing_oauth:
        result = await db.execute(
            select(User).where(User.id == existing_oauth.user_id)
        )
        user = result.scalar_one()
        logger.info("Returning user via OAuth account", extra={
            "user_id": user.id, "provider": provider
        })
        return user

    # 2. Email match — link new provider to existing account
    result = await db.execute(
        select(User).where(User.email == email, User.is_deleted == False)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if not user:
        # 3. Brand new user
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()  # get user.id without committing
        logger.info("Created new user", extra={"user_id": user.id, "provider": provider})

    # Create the OAuth account link
    oauth_account = OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=str(provider_user_id),
        provider_email=email,
    )
    db.add(oauth_account)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def soft_delete_user(db: AsyncSession, user_id: str) -> bool:
    """
    Marks user as deleted. Never removes the row.
    Returns True if deleted, False if user not found.
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        return False
    user.soft_delete()
    # Revoke all active sessions
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.revoked == False,  # noqa: E712
        )
    )
    for session in result.scalars().all():
        session.revoked = True
    await db.commit()
    logger.info("User soft-deleted, all sessions revoked", extra={"user_id": user_id})
    return True
