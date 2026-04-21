"""
FastAPI auth dependencies.

Usage:
    @router.get("/protected")
    async def handler(user: User = Depends(require_user)):
        ...

    @router.get("/admin-only")
    async def handler(user: User = Depends(require_admin)):
        ...
"""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import User
from services.auth_service import decode_token, is_session_valid, get_user_by_id

logger = logging.getLogger("underhaus.auth")

_bearer = HTTPBearer(auto_error=False)


async def _get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        return None

    jti     = payload.get("jti")
    user_id = payload.get("sub")

    if not jti or not user_id:
        return None

    if not await is_session_valid(db, jti):
        return None

    return await get_user_by_id(db, user_id)


async def require_user(
    user: Optional[User] = Depends(_get_current_user),
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    user: User = Depends(require_user),
) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# Optional — returns user if authenticated, None if not (for public routes with optional auth)
async def optional_user(
    user: Optional[User] = Depends(_get_current_user),
) -> Optional[User]:
    return user
