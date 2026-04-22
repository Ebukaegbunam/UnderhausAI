import os
from dotenv import load_dotenv
load_dotenv()  # must run before any module that reads env vars at import time

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from services.logger import setup_logging
from middleware.request_tracker import RequestTrackerMiddleware
from db.session import init_db
from routes import listings, health, auth
setup_logging(level=os.getenv("LOG_LEVEL", "INFO"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="UnderhausAI API",
    description="Backend API for UnderhausAI — real estate deal discovery and underwriting",
    version=os.getenv("APP_VERSION", "0.1.0"),
    lifespan=lifespan,
)

# Middleware — order matters: outermost first
_allowed_origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5175,http://localhost:4173"
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# SessionMiddleware is required by authlib for OAuth state storage
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "CHANGE_ME_SESSION_SECRET"),
)
app.add_middleware(RequestTrackerMiddleware)

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(health.router)


@app.get("/", tags=["root"])
async def root():
    return {"status": "ok", "service": "UnderhausAI"}
