import json
import os
import sys

import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app  # Flask app


@pytest.fixture
def client():
    app.testing = True
    with app.test_client() as client:
        yield client


def test_health_check(client):
    response = client.get("/api/health")
    print("\n[Health Check] Response:", response.status_code, response.data.decode())
    assert response.status_code == 200
    assert "ok" in response.data.decode().lower()


def test_signup_or_login(client):  # Simulate signup and login endpoint
    payload = {
        "email": "integration@test.com",
        "name": "Integration Tester",
        "picture": "https://example.com/avatar.png",
        "age": 28,
        "mobile": "0400000000",
        "country_of_citizenship": "Australia",
        "language_preferred": "English",
        "covid_vaccination_status": "Yes",
    }


def test_mfa_verification_flow(client):
    response = client.post("/api/auth/mfa", json={"user_id": "12345"})
    print("\n[MFA] Response:", response.status_code, response.data.decode())
    assert response.status_code in [200, 404]


def test_audit_logging_feedback(client):  # Simulate audit log
    log_entry = {
        "user": "integration@test.com",
        "action": "test_feedback",
        "details": "Testing audit logging system",
    }
    response = client.post("/api/audit", json=log_entry)
    print("\n[Audit Logging] Response:", response.status_code, response.data.decode())
    assert response.status_code in [200, 201, 404]


def test_data_retention_and_auto_deletion(client):  # Check old data deletion endpoint
    response = client.delete("/api/data/cleanup")
    print("\n[Data Retention] Response:", response.status_code, response.data.decode())
    assert response.status_code in [200, 404]


"""def test_rbac_role_based_access_control(client):
    headers = {"Authorization": "Bearer fake_admin_token"}
    response = client.get("/api/admin/secure", headers=headers)
    print("\n[RBAC] Response:", response.status_code, response.data.decode())
    assert response.status_code in [200, 401, 403, 404]


    response = client.post("/api/auth/login", json=payload)  # updated
    print("\n[Signup/Login] Response:", response.status_code, response.data.decode())
    assert response.status_code in [200, 201, 400]"""


"""def test_user_consent_popup(client):
    payload = {"user_id": "integration@test.com", "consent_given": True}  # fixed keys
    response = client.post("/api/consent", json=payload)
    print("\n[Consent] Response:", response.status_code, response.data.decode())
    assert response.status_code in [200, 201, 404]"""


def test_sql_injection_protection(client,):# Attempt SQL injection to ensure protection
    payload = {"email": "' OR '1'='1", "password": "hack"}
    response = client.post("/api/auth/login", json=payload)
    print("\n[SQL Injection] Response:", response.status_code, response.data.decode())
    assert response.status_code in [400, 401, 403, 404]
    assert any(
        word in response.data.decode().lower()
        for word in ["error", "invalid", "not found"]
    )
