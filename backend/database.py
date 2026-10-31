import os
import tempfile
from pathlib import Path
from datetime import datetime
import zoneinfo
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load from backend/ or parent root/ .env
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

def get_sqlite_path() -> str:
    # On Vercel / AWS Lambda, the app root is read-only. Fallback DB must write to /tmp.
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = Path(tempfile.gettempdir()) / "dev_fallback.db"
        return f"sqlite:///{tmp_db}"
    return "sqlite:///./dev_fallback.db"

def now_ist() -> datetime:
    """Return naive datetime in Asia/Kolkata."""
    return datetime.now(zoneinfo.ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)

def get_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_url:
        return get_sqlite_path()

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
            return get_sqlite_path()

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
        return create_engine(get_sqlite_path(), connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def upgrade_schema(target_engine):
    """Safely apply backward-compatible column additions to existing tables."""
    from sqlalchemy import text, inspect
    try:
        insp = inspect(target_engine)
        tables = insp.get_table_names()
        
        with target_engine.connect() as conn:
            is_sqlite = target_engine.dialect.name == "sqlite"
            
            # 1. Update transactions table columns
            if "transactions" in tables:
                cols = [c["name"] for c in insp.get_columns("transactions")]
                new_cols = [
                    ("utr", "VARCHAR(64)"),
                    ("order_ref", "VARCHAR(64)"),
                    ("payer_vpa", "VARCHAR(128)"),
                    ("last_synced_at", "TIMESTAMP" if is_sqlite else "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
                ]
                for col_name, col_type in new_cols:
                    if col_name not in cols:
                        stmt = f"ALTER TABLE transactions ADD COLUMN {col_name} {col_type};"
                        try:
                            conn.execute(text(stmt))
                            conn.commit()
                        except Exception as ce:
                            print(f"Notice adding column {col_name} to transactions: {ce}")

            # 2. Update merchants table columns
            if "merchants" in tables:
                cols = [c["name"] for c in insp.get_columns("merchants")]
                new_cols = [
                    ("preferred_language", "VARCHAR(16) DEFAULT 'en'"),
                    ("voice_response_enabled", "BOOLEAN DEFAULT TRUE" if not is_sqlite else "INTEGER DEFAULT 1"),
                    ("speech_rate", "FLOAT DEFAULT 1.0"),
                    ("preferred_voice_identifier", "VARCHAR(128) DEFAULT ''"),
                ]
                for col_name, col_type in new_cols:
                    if col_name not in cols:
                        stmt = f"ALTER TABLE merchants ADD COLUMN {col_name} {col_type};"
                        try:
                            conn.execute(text(stmt))
                            conn.commit()
                        except Exception as ce:
                            print(f"Notice adding column {col_name} to merchants: {ce}")
    except Exception as e:
        print(f"Notice during schema upgrade check: {e}")

def fallback_to_sqlite():
    global engine, SessionLocal
    sqlite_url = get_sqlite_path()
    print(f"Failing over database engine to SQLite ({sqlite_url})...")
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SessionLocal.configure(bind=engine)
    upgrade_schema(engine)
    return engine

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

