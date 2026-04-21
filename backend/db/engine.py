import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# SQLite for local dev → swap DATABASE_URL for Postgres on deploy
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./data/underhaus.db"
)

if "sqlite" in DATABASE_URL:
    _connect_args = {"check_same_thread": False}
elif "asyncpg" in DATABASE_URL:
    # Supabase transaction pooler doesn't support prepared statements
    _connect_args = {"statement_cache_size": 0}
else:
    _connect_args = {}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass
