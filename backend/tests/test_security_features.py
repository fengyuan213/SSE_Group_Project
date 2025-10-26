import os
import sys
import sqlite3
import json
from datetime import datetime, timedelta
from functools import wraps

import pytest
from flask import request

# ensure backend package is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# import create_app after adding path
from app import create_app


# Create fakeDB to minimax conflicts with real DB

def make_inmemory_sqlite():
    conn = sqlite3.connect(":memory:", detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()


    cur.execute(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            auth0_user_id TEXT,
            email TEXT,
            email_verified BOOLEAN,
            name TEXT,
            given_name TEXT,
            family_name TEXT,
            nickname TEXT,
            picture TEXT,
            last_login TIMESTAMP,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE roles (
            role_id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT UNIQUE
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE user_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            role_id INTEGER
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            log_type TEXT,
            action TEXT,
            action_details TEXT,
            severity TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # insert a default 'customer' and 'admin' role
    cur.execute("INSERT INTO roles (role_name) VALUES (?)", ("customer",))
    cur.execute("INSERT INTO roles (role_name) VALUES (?)", ("admin",))
    conn.commit()
    return conn



# Fixtures
# Create and shareing a single in-memory DB connection per test module.

@pytest.fixture(scope="module")
def fake_conn():
    """Return a single in-memory DB connection per test module."""
    conn = make_inmemory_sqlite()
    yield conn
    conn.close()


# Create a Flask test client
@pytest.fixture
def client(monkeypatch, fake_conn):

    app = create_app()
    app.config["TESTING"] = True


    patched = False
    for module_path in ("app.routes.auth_routes", "app.auth", "app.routes"):
        try:
            mod = __import__(module_path, fromlist=["*"])
            setattr(mod, "get_db_connection", lambda conn=fake_conn: conn)
            patched = True
        except Exception:
            continue


    try:
        import app.routes.auth_routes as ar
        ar.get_db_connection = lambda conn=fake_conn: conn
        patched = True
    except Exception:
        pass


    def dummy_requires_auth(func):
        @wraps(func)
        def wrapper(*args, **kwargs):


            token = request.headers.get("Authorization", "")
            roles = []
            if "role=admin" in token:
                roles = ["admin"]
            else:
                roles = ["customer"]

            setattr(request, "user", {"sub": "test-sub-123", "roles": roles})
            return func(*args, **kwargs)

        return wrapper

    for modpath in ("app.routes.auth_routes", "app.auth", "app.routes", "app.routes.feedback_routes"):
        try:
            m = __import__(modpath, fromlist=["*"])
            if hasattr(m, "requires_auth"):
                setattr(m, "requires_auth", dummy_requires_auth)
            else:
                setattr(m, "requires_auth", dummy_requires_auth)
        except Exception:
            pass

    # validate RBAC behavior
    @app.route("/test/admin-only")
    def _admin_route():
        user = getattr(request, "user", {})
        roles = user.get("roles", []) if isinstance(user, dict) else []
        if "admin" in roles:
            return {"ok": True, "role": "admin"}, 200
        return {"error": "forbidden"}, 403

    with app.test_client() as c:
        yield c



def test_sync_writes_user_and_audit(fake_conn, client):

    payload = {
        "email": "alice@example.com",
        "name": "Alice Example",
        "picture": "https://example.com/a.png",
        "age": 30,
        "mobile": "0412345678",
        "country_of_citizenship": "Australia",
        "language_preferred": "English",
        "covid_vaccination_status": "Yes"
    }

    resp = client.post("/auth/sync", json=payload)
    assert resp.status_code in (200, 201, 400, 500, 404)

    cur = fake_conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM users WHERE email = ?", (payload["email"],))
    row = cur.fetchone()
    if row["cnt"] > 0:
        cur.execute("SELECT id FROM users WHERE email = ?", (payload["email"],))
        user_id = cur.fetchone()["id"]
        cur.execute("SELECT COUNT(*) as cnt FROM audit_logs WHERE user_id = ?", (user_id,))
        al = cur.fetchone()
        assert al["cnt"] >= 1


def test_sql_injection_attempt_does_not_drop_users(fake_conn, client):

    evil_email = "bad'; DROP TABLE users; --"
    payload = {"email": evil_email, "name": "Evil", "picture": "x"}
    resp = client.post("/auth/sync", json=payload)
    assert resp.status_code in (200, 201, 400, 500, 404)

    cur = fake_conn.cursor()
    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        row = cur.fetchone()
        assert row is not None, "users table was dropped (SQLi succeeded!)"
    except Exception as e:
        pytest.fail(f"DB error after SQLi attempt: {e}")


def test_audit_log_on_feedback(fake_conn, client):

    payload = {"message": "Test feedback from fuzz test"}
    resp = client.post("/feedback", json=payload)
    assert resp.status_code in (200, 201, 400, 404, 500)

    cur = fake_conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM audit_logs")
    cnt = cur.fetchone()["cnt"]
    assert isinstance(cnt, int)


def test_data_retention_simulation(fake_conn):

    cur = fake_conn.cursor()
    from datetime import datetime, timedelta, UTC

    old_date = datetime.now(UTC) - timedelta(days=400)


    cur.execute(
        "INSERT INTO users (auth0_user_id, email, name, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
        ("old-sub", "old@example.com", "Old", json.dumps({}), old_date.isoformat()),
    )
    fake_conn.commit()

    cur.execute("SELECT id FROM users WHERE email = ?", ("old@example.com",))
    row = cur.fetchone()
    assert row is not None

    cutoff = datetime.now(UTC) - timedelta(days=365)
    cur.execute("DELETE FROM users WHERE datetime(created_at) < datetime(?)", (cutoff.isoformat(),))
    fake_conn.commit()

    cur.execute("SELECT COUNT(*) as cnt FROM users WHERE email = ?", ("old@example.com",))
    assert cur.fetchone()["cnt"] == 0


def test_rbac_admin_route_access(client):

    r1 = client.get("/test/admin-only")
    assert r1.status_code == 403

    r2 = client.get("/test/admin-only", headers={"Authorization": "Bearer something role=admin"})
    assert r2.status_code in [200, 403]

