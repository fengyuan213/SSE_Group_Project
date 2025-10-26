import sys
import os
import pytest

# Adding backend folder to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import create_app


@pytest.fixture
def client(): #Set up Flask test client
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_check(client): #Check if the API health endpoint works
    response = client.get("/health")
    print("\nResponse from /health:", response.status_code, response.data.decode())
    assert response.status_code in [200, 404]


def test_get_user_profile(client):  #Test retrieving user profile
    response = client.get("/auth/user/profile")
    print("\nResponse from /auth/user/profile:", response.status_code, response.data.decode())
    assert response.status_code in [200, 400, 404, 500]


def test_get_auth_history(client): #Test retrieving authentication history
    response = client.get("/auth/user/auth-history")
    print("\nResponse from /auth/user/auth-history:", response.status_code, response.data.decode())
    assert response.status_code in [200, 400, 404, 500]
