
import os
import ssl
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker


load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = None
SessionLocal = None

if DATABASE_URL:
    url = make_url(DATABASE_URL)
    safe_query = {
        key: value
        for key, value in url.query.items()
        if key.lower() not in {"sslmode", "channel_binding"}
    }
    pg8000_url = url.set(
        drivername="postgresql+pg8000",
        query=safe_query,
    )

    engine = create_engine(
        pg8000_url,
        connect_args={"ssl_context": ssl.create_default_context()},
        pool_pre_ping=True,
    )

    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

Base = declarative_base()


def get_db():
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
