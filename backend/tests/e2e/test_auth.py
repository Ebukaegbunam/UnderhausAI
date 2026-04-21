"""
E2E auth tests — login (first-time register), returning login, logout, /me, delete account.

Strategy:
  - OAuth provider network calls are mocked (no real Google/GitHub traffic).
  - Database is the real SQLite used by the app (initialised via lifespan in conftest).
  - For routes that need a valid JWT we call get_or_create_user + create_access_token +
    save_session directly, then hit the route with the Bearer token — this is the same
    path the callback would take, without repeating the OAuth mock boilerplate.

Coverage:
  1.  Unsupported provider → 400
  2.  Supported provider login redirect → 3xx (redirect to provider)
  3.  Google callback — brand-new user → creates user, redirects with token
  4.  Google callback — returning user → finds same user, issues new token
  5.  GitHub callback — new user, email in public profile
  6.  GitHub callback — new user, email private (fetched from /user/emails)
  7.  Callback — same email, different provider → links new provider to existing account
  8.  Callback — soft-deleted user → redirects to error?reason=account_deleted
  9.  GET /auth/me — authenticated → returns user shape
  10. GET /auth/me — no token → 401
  11. GET /auth/me — revoked token → 401
  12. DELETE /auth/session (logout) — revokes token; subsequent /me returns 401
  13. DELETE /auth/me (delete account) — soft-deletes; subsequent /me returns 401
"""

import asyncio
import os
import uuid
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

# ── env must be set before app import ──────────────────────────────────────
os.environ["ZILLOW_MOCK_MODE"] = "true"
os.environ.setdefault("RAPIDAPI_KEY", "test-key")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-auth-tests-only")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

from main import app  # noqa: E402
from db.session import get_db  # noqa: E402
from db.engine import AsyncSessionLocal  # noqa: E402
from services.auth_service import (  # noqa: E402
    create_access_token,
    save_session,
    get_or_create_user,
    is_session_valid,
    decode_token,
)


# ── fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client() -> TestClient:
    """
    App-level TestClient.  follow_redirects=False lets us inspect redirect
    responses rather than chasing them to the (non-existent) frontend URL.
    """
    with TestClient(app, raise_server_exceptions=True, follow_redirects=False) as c:
        yield c


def _run(coro):
    """Run an async helper inside a sync test."""
    return asyncio.get_event_loop().run_until_complete(coro)


async def _create_user_with_token(
    email: str,
    provider: str = "google",
    name: str = "Test User",
    deleted: bool = False,
) -> tuple[str, str, str]:
    """
    Creates a real User + OAuthAccount + UserSession in the DB.
    Returns (user_id, jwt_token, jti).
    """
    async with AsyncSessionLocal() as db:
        provider_uid = str(uuid.uuid4())
        user = await get_or_create_user(
            db=db,
            provider=provider,
            provider_user_id=provider_uid,
            email=email,
            name=name,
        )
        if deleted:
            user.soft_delete()
            await db.commit()
            await db.refresh(user)
        token, jti = create_access_token(user)
        await save_session(db, user.id, jti)
        return user.id, token, jti


# ── helpers ──────────────────────────────────────────────────────────────────

def _mock_oauth_client(token_payload: dict, github_user_resp: Optional[dict] = None,
                       github_emails_resp: Optional[list] = None) -> MagicMock:
    """
    Returns a mock authlib client for use in patch('routes.auth.oauth.create_client').
    """
    client = AsyncMock()

    # authorize_redirect — returns a basic 302 to simulate provider redirect
    from starlette.responses import RedirectResponse as _RR
    client.authorize_redirect = AsyncMock(
        return_value=_RR(url="https://provider.example.com/oauth/authorize")
    )

    # authorize_access_token — returns the token payload dict
    client.authorize_access_token = AsyncMock(return_value=token_payload)

    # get() — used by GitHub for user + email endpoints
    async def _mock_get(path, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        if path == "user":
            resp.json = MagicMock(return_value=github_user_resp or {})
        elif path == "user/emails":
            resp.json = MagicMock(return_value=github_emails_resp or [])
        else:
            resp.json = MagicMock(return_value={})
        return resp

    client.get = AsyncMock(side_effect=_mock_get)
    return client


# ── 1. Unsupported provider ──────────────────────────────────────────────────

def test_unsupported_provider_login(client):
    resp = client.get("/auth/twitter")
    assert resp.status_code == 400
    assert "Unsupported provider" in resp.json()["detail"]


# ── 2. Login redirect (supported provider) ───────────────────────────────────

@pytest.mark.parametrize("provider", ["google", "github"])
def test_login_redirect(client, provider):
    mock_client = _mock_oauth_client({})
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp = client.get(f"/auth/{provider}")
    # Should be a redirect to the OAuth provider
    assert resp.status_code in (302, 307)


# ── 3. Google callback — brand-new user ──────────────────────────────────────

def test_google_callback_new_user(client):
    email = f"newuser-{uuid.uuid4()}@gmail.com"
    token_payload = {
        "userinfo": {
            "sub": str(uuid.uuid4()),
            "email": email,
            "name": "New Google User",
            "picture": "https://lh3.googleusercontent.com/photo.jpg",
        }
    }
    mock_client = _mock_oauth_client(token_payload)
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp = client.get("/auth/google/callback", params={"code": "fake-code", "state": "fake-state"})

    assert resp.status_code in (302, 307)
    location = resp.headers["location"]
    assert "/auth/callback?token=" in location

    # Token must be a valid JWT
    token = location.split("token=")[1]
    payload = decode_token(token)
    assert payload["email"] == email


# ── 4. Google callback — returning user ──────────────────────────────────────

def test_google_callback_returning_user(client):
    provider_uid = str(uuid.uuid4())
    email = f"returning-{uuid.uuid4()}@gmail.com"
    token_payload = {
        "userinfo": {
            "sub": provider_uid,
            "email": email,
            "name": "Returning User",
        }
    }
    mock_client = _mock_oauth_client(token_payload)

    # First login — creates user
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp1 = client.get("/auth/google/callback", params={"code": "c1", "state": "s1"})

    # Second login — returns same user
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp2 = client.get("/auth/google/callback", params={"code": "c2", "state": "s2"})

    assert resp1.status_code in (302, 307)
    assert resp2.status_code in (302, 307)

    token1 = resp1.headers["location"].split("token=")[1]
    token2 = resp2.headers["location"].split("token=")[1]

    payload1 = decode_token(token1)
    payload2 = decode_token(token2)

    # Same user ID, different JTI (two sessions issued)
    assert payload1["sub"] == payload2["sub"]
    assert payload1["jti"] != payload2["jti"]


# ── 5. GitHub callback — email in public profile ──────────────────────────────

def test_github_callback_public_email(client):
    email = f"gh-public-{uuid.uuid4()}@example.com"
    token_payload = {"access_token": "gho_fake"}
    gh_user = {
        "id": int(uuid.uuid4().int % 1_000_000),
        "login": "gh-user",
        "name": "GitHub User",
        "email": email,
        "avatar_url": "https://avatars.githubusercontent.com/u/123",
    }
    mock_client = _mock_oauth_client(token_payload, github_user_resp=gh_user)
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp = client.get("/auth/github/callback", params={"code": "fake", "state": "fake"})

    assert resp.status_code in (302, 307)
    assert "/auth/callback?token=" in resp.headers["location"]


# ── 6. GitHub callback — private email, fetched from /user/emails ─────────────

def test_github_callback_private_email(client):
    email = f"gh-private-{uuid.uuid4()}@example.com"
    token_payload = {"access_token": "gho_fake"}
    gh_user = {
        "id": int(uuid.uuid4().int % 1_000_000),
        "login": "private-user",
        "name": "Private Email User",
        "email": None,  # not public
        "avatar_url": None,
    }
    emails_payload = [
        {"email": "other@example.com", "primary": False, "verified": True},
        {"email": email,                "primary": True,  "verified": True},
    ]
    mock_client = _mock_oauth_client(token_payload, github_user_resp=gh_user,
                                     github_emails_resp=emails_payload)
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp = client.get("/auth/github/callback", params={"code": "fake", "state": "fake"})

    assert resp.status_code in (302, 307)
    token = resp.headers["location"].split("token=")[1]
    assert decode_token(token)["email"] == email


# ── 7. Same email, different provider → links account ────────────────────────

def test_callback_links_second_provider(client):
    """User authenticated via Google first, then logs in via GitHub with same email."""
    email = f"linked-{uuid.uuid4()}@example.com"
    google_uid = str(uuid.uuid4())
    github_uid = str(int(uuid.uuid4().int % 1_000_000))

    # First: Google login
    google_payload = {"userinfo": {"sub": google_uid, "email": email, "name": "Linked User"}}
    mock_google = _mock_oauth_client(google_payload)
    with patch("routes.auth.oauth.create_client", return_value=mock_google):
        resp_g = client.get("/auth/google/callback", params={"code": "gc", "state": "gs"})

    # Second: GitHub login with same email
    github_token = {"access_token": "gho_linked"}
    gh_user = {"id": int(github_uid), "login": "linked", "name": "Linked User", "email": email}
    mock_github = _mock_oauth_client(github_token, github_user_resp=gh_user)
    with patch("routes.auth.oauth.create_client", return_value=mock_github):
        resp_gh = client.get("/auth/github/callback", params={"code": "ghc", "state": "ghs"})

    assert resp_g.status_code in (302, 307)
    assert resp_gh.status_code in (302, 307)

    token_g  = resp_g.headers["location"].split("token=")[1]
    token_gh = resp_gh.headers["location"].split("token=")[1]

    # Both tokens must belong to the same user
    assert decode_token(token_g)["sub"] == decode_token(token_gh)["sub"]


# ── 8. Deleted user callback → error redirect ────────────────────────────────

def test_callback_deleted_user(client):
    """A soft-deleted user who tries to log in again gets an error redirect."""
    email = f"deleted-cb-{uuid.uuid4()}@example.com"
    provider_uid = str(uuid.uuid4())

    # Create + soft-delete the user first
    async def _setup():
        async with AsyncSessionLocal() as db:
            user = await get_or_create_user(
                db=db, provider="google",
                provider_user_id=provider_uid,
                email=email, name="Deleted User",
            )
            user.soft_delete()
            await db.commit()

    _run(_setup())

    token_payload = {
        "userinfo": {"sub": provider_uid, "email": email, "name": "Deleted User"}
    }
    mock_client = _mock_oauth_client(token_payload)
    with patch("routes.auth.oauth.create_client", return_value=mock_client):
        resp = client.get("/auth/google/callback", params={"code": "fake", "state": "fake"})

    assert resp.status_code in (302, 307)
    assert "reason=account_deleted" in resp.headers["location"]


# ── 9. GET /auth/me — authenticated ──────────────────────────────────────────

def test_get_me_authenticated(client):
    email = f"me-{uuid.uuid4()}@example.com"
    _, token, _ = _run(_create_user_with_token(email))
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == email
    assert "id" in data
    assert data["role"] == "user"
    assert data["plan"] == "free"


def test_get_me_returns_correct_shape(client):
    email = f"me-shape-{uuid.uuid4()}@example.com"
    _, token, _ = _run(_create_user_with_token(email, name="Shape Tester"))
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    data = resp.json()
    for field in ("id", "email", "name", "avatar_url", "role", "plan"):
        assert field in data, f"Missing field: {field}"


# ── 10. GET /auth/me — no token ───────────────────────────────────────────────

def test_get_me_no_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


# ── 11. GET /auth/me — revoked token ─────────────────────────────────────────

def test_get_me_revoked_token(client):
    email = f"revoked-me-{uuid.uuid4()}@example.com"
    user_id, token, jti = _run(_create_user_with_token(email))

    # Revoke the session directly
    async def _revoke():
        from services.auth_service import revoke_session
        async with AsyncSessionLocal() as db:
            await revoke_session(db, jti)

    _run(_revoke())

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


# ── 12. DELETE /auth/session — logout ────────────────────────────────────────

def test_logout_revokes_session(client):
    email = f"logout-{uuid.uuid4()}@example.com"
    _, token, jti = _run(_create_user_with_token(email))

    # Confirm we're authenticated before logout
    resp_before = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_before.status_code == 200

    # Logout
    resp_logout = client.request(
        "DELETE", "/auth/session",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_logout.status_code == 200
    assert resp_logout.json()["status"] == "logged_out"

    # Token no longer works
    resp_after = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_after.status_code == 401


def test_logout_without_token_returns_401(client):
    resp = client.request("DELETE", "/auth/session")
    assert resp.status_code == 401


# ── 13. DELETE /auth/me — delete account ─────────────────────────────────────

def test_delete_account_soft_deletes(client):
    email = f"delete-account-{uuid.uuid4()}@example.com"
    user_id, token, _ = _run(_create_user_with_token(email))

    resp = client.request(
        "DELETE", "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "account_deleted"

    # Token is now revoked — /auth/me must 401
    resp_after = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_after.status_code == 401


def test_delete_account_user_row_still_exists(client):
    """Soft delete must not remove the DB row."""
    email = f"soft-delete-{uuid.uuid4()}@example.com"
    user_id, token, _ = _run(_create_user_with_token(email))

    client.request("DELETE", "/auth/me", headers={"Authorization": f"Bearer {token}"})

    async def _check():
        from db.models import User as UserModel
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(UserModel).where(UserModel.id == user_id))
            user = result.scalar_one_or_none()
            return user

    user = _run(_check())
    assert user is not None, "Row must still exist after soft delete"
    assert user.is_deleted is True
    assert user.deleted_at is not None


def test_delete_account_without_token_returns_401(client):
    resp = client.request("DELETE", "/auth/me")
    assert resp.status_code == 401
