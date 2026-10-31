import os
from pathlib import Path
from datetime import datetime
import zoneinfo
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load from backend/ or parent root/ .env
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

def now_ist() -> datetime:
    """Return naive datetime in Asia/Kolkata."""
    return datetime.now(zoneinfo.ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)

def get_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_url:
        return "sqlite:///./dev_fallback.db"

    # Select available PostgreSQL driver: psycopg (v3) preferred, fallback to psycopg2
    driver = None
    try:
        import psycopg  # noqa: F401
        driver = "postgresql+psycopg://"
    except ImportError:
        try:
            import psycopg2  # noqa: F401
            driver = "postgresql+psycopg2://"
        except ImportError:
            print("Notice: Neither psycopg (v3) nor psycopg2 found. Falling back to SQLite.")
            return "sqlite:///./dev_fallback.db"

    clean_url = raw_url
    if clean_url.startswith("postgres://"):
        clean_url = driver + clean_url[len("postgres://"):]
    elif clean_url.startswith("postgresql://") and not clean_url.startswith("postgresql+"):
        clean_url = driver + clean_url[len("postgresql://"):]

    # psycopg2 does not support channel_binding query parameter; strip it cleanly
    if driver == "postgresql+psycopg2://" and "channel_binding" in clean_url:
        import re
        clean_url = re.sub(r"[&?]channel_binding=[^&]*", "", clean_url)
        if "?" not in clean_url and "&" in clean_url:
            clean_url = clean_url.replace("&", "?", 1)

    return clean_url

def create_db_engine():
    url = get_database_url()
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    try:
        return create_engine(
            url,
            pool_pre_ping=True,
            pool_size=5,
            pool_recycle=300,
        )
    except Exception as e:
        print(f"Warning creating engine for {url}: {e}. Falling back to SQLite.")
        return create_engine("sqlite:///./dev_fallback.db", connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def fallback_to_sqlite():
    global engine, SessionLocal
    print("Failing over database engine to SQLite dev_fallback.db...")
    engine = create_engine("sqlite:///./dev_fallback.db", connect_args={"check_same_thread": False})
    SessionLocal.configure(bind=engine)
    return engine

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

