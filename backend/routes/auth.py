"""
OAuth 2.0 authentication routes — Google and GitHub.

Flow:
  1. Frontend calls GET /auth/{provider}  → backend redirects to provider
  2. Provider redirects to GET /auth/{provider}/callback?code=...
  3. Backend exchanges code, gets user info, creates/finds user, issues JWT
  4. Backend redirects to {FRONTEND_URL}/auth/callback?token={jwt}
  5. Frontend stores token, uses as Bearer in all subsequent requests

Logout:
  DELETE /auth/session  →  revokes current JWT (server-side)

Delete account (soft):
  DELETE /auth/me  →  marks user as deleted, revokes all sessions
"""
import os
import logging
from typing import Optional

import httpx
from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import User
from services.auth_service import (
    create_access_token,
    save_session,
    revoke_session,
    get_or_create_user,
    soft_delete_user,
    decode_token,
)
from dependencies.auth import require_user

logger = logging.getLogger("underhaus.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001")

# ---------------------------------------------------------------------------
# OAuth client setup
# ---------------------------------------------------------------------------

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=os.getenv("GITHUB_CLIENT_ID"),
    client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    access_token_url="https://github.com/login/oauth/access_token",
    access_token_params=None,
    authorize_url="https://github.com/login/oauth/authorize",
    authorize_params=None,
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)

SUPPORTED_PROVIDERS = {"google", "github"}


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    role: str
    plan: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _redirect_with_token(token: str) -> RedirectResponse:
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={token}")


def _redirect_with_error(error: str) -> RedirectResponse:
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/error?reason={error}")


async def _github_get_email(client, token: dict) -> Optional[str]:
    """GitHub may not expose email publicly — fetch from /user/emails."""
    resp = await client.get("user/emails", token=token)
    if resp.status_code != 200:
        return None
    emails = resp.json()
    # Prefer primary + verified email
    for entry in emails:
        if entry.get("primary") and entry.get("verified"):
            return entry["email"]
    # Fall back to any verified email
    for entry in emails:
        if entry.get("verified"):
            return entry["email"]
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse, summary="Get current user")
async def get_me(user: User = Depends(require_user)):
    return user


@router.get("/{provider}", summary="Redirect to OAuth provider")
async def oauth_login(provider: str, request: Request):
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    redirect_uri = f"{API_BASE_URL}/auth/{provider}/callback"
    client = oauth.create_client(provider)
    return await client.authorize_redirect(request, redirect_uri, response_type="code")


@router.get("/{provider}/callback", summary="OAuth callback — do not call directly")
async def oauth_callback(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if provider not in SUPPORTED_PROVIDERS:
        return _redirect_with_error("unsupported_provider")

    client = oauth.create_client(provider)

    try:
        token = await client.authorize_access_token(request)
    except OAuthError as e:
        logger.warning(f"OAuth error from {provider}: {e}", extra={"error_tag": "UH-AUTH-001"})
        return _redirect_with_error("oauth_failed")

    # --- Extract user info per provider ---
    try:
        if provider == "google":
            user_info = token.get("userinfo") or {}
            provider_user_id = user_info.get("sub")
            email            = user_info.get("email")
            name             = user_info.get("name")
            avatar_url       = user_info.get("picture")

        elif provider == "github":
            resp = await client.get("user", token=token)
            gh_user = resp.json()
            provider_user_id = str(gh_user.get("id"))
            email            = gh_user.get("email")
            name             = gh_user.get("name") or gh_user.get("login")
            avatar_url       = gh_user.get("avatar_url")

            # GitHub email may be private — fetch from /user/emails
            if not email:
                email = await _github_get_email(client, token)

    except Exception as e:
        logger.error(f"Failed to fetch user info from {provider}: {e}",
                     extra={"error_tag": "UH-AUTH-002"})
        return _redirect_with_error("user_info_failed")

    if not provider_user_id or not email:
        logger.warning(f"Missing required fields from {provider}",
                       extra={"error_tag": "UH-AUTH-003"})
        return _redirect_with_error("missing_user_info")

    # --- Create or retrieve user ---
    user = await get_or_create_user(
        db=db,
        provider=provider,
        provider_user_id=provider_user_id,
        email=email,
        name=name,
        avatar_url=avatar_url,
    )

    if user.is_deleted:
        return _redirect_with_error("account_deleted")

    # --- Issue JWT ---
    jwt_token, jti = create_access_token(user)
    await save_session(db, user.id, jti)

    logger.info("User authenticated", extra={
        "user_id": user.id, "provider": provider
    })

    return _redirect_with_token(jwt_token)


@router.delete("/session", summary="Logout — revoke current token")
async def logout(
    request: Request,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
        jti = payload.get("jti")
        if jti:
            await revoke_session(db, jti)
    except JWTError:
        pass  # Token already invalid — logout is a no-op
    return {"status": "logged_out"}


@router.post("/dev-login", summary="Dev-only login — disabled in production")
async def dev_login(db: AsyncSession = Depends(get_db)):
    """
    Creates a dev test user and returns a JWT. Only works when DEV_MODE=true in .env.
    Never expose this in production.
    """
    if os.getenv("DEV_MODE", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Dev login is disabled. Set DEV_MODE=true in .env to enable.")

    user = await get_or_create_user(
        db=db,
        provider="dev",
        provider_user_id="dev-user-001",
        email="dev@underhaus.local",
        name="Dev User",
        avatar_url=None,
    )
    jwt_token, jti = create_access_token(user)
    await save_session(db, user.id, jti)
    return {"token": jwt_token}


@router.delete("/me", summary="Delete account (soft delete — data is preserved)")
async def delete_account(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks the user as deleted and revokes all their sessions.
    The user row and all associated data are never physically removed.
    """
    await soft_delete_user(db, user.id)
    return {
        "status": "account_deleted",
        "message": "Your account has been deactivated. Your data is retained per our retention policy.",
    }
