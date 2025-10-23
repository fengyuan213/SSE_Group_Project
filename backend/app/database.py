"""Database connection and utilities."""

import os
from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor


def get_db_config():
    """Get database configuration from environment variables."""
    return {
        "host": os.getenv("PGHOST", "db"),
        "port": os.getenv("PGPORT", "5432"),
        "database": os.getenv("PGDATABASE", "sse_project"),
        "user": os.getenv("PGUSER", "postgres"),
        "password": os.getenv("PGPASSWORD", "postgres"),
    }


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Context manager for database connections.
    Automatically handles connection cleanup.

    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users")
                results = cur.fetchall()
    """
    conn = None
    try:
        config = get_db_config()
        conn = psycopg2.connect(**config, cursor_factory=RealDictCursor)
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()


def test_connection():
    """Test database connection."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
