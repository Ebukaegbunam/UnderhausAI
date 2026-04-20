import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from services.logger import setup_logging
from middleware.request_tracker import RequestTrackerMiddleware
from routes import listings, health

load_dotenv()
setup_logging(level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(
    title="UnderhausAI API",
    description="Backend API for UnderhausAI — real estate deal discovery and underwriting",
    version=os.getenv("APP_VERSION", "0.1.0"),
)

# Order matters: CORS first, then request tracker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestTrackerMiddleware)

app.include_router(listings.router)
app.include_router(health.router)


@app.get("/", tags=["root"])
async def root():
    return {"status": "ok", "service": "UnderhausAI"}
