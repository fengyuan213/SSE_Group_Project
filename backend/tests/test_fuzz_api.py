import sys
import os
import pytest
from hypothesis import given, strategies as st

# Ensure backend path is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # your Flask app factory

# Create Flask test client
@pytest.fixture(scope="module")
def client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()

# Fuzz tesing for /auth/sync

@given(
    email=st.text(min_size=1, max_size=30),
    name=st.text(min_size=1, max_size=20),
    picture=st.text(min_size=1, max_size=50),
    age=st.integers(min_value=0, max_value=120),
    mobile=st.text(min_size=1, max_size=15),
    country=st.text(min_size=1, max_size=30),
    lang=st.text(min_size=1, max_size=20),
    vax=st.sampled_from(["Yes", "No", "Unknown"])
)
def test_fuzz_sync_user(client, email, name, picture, age, mobile, country, lang, vax):
    payload = {
        "email": email,
        "name": name,
        "picture": picture,
        "age": age,
        "mobile": mobile,
        "country_of_citizenship": country,
        "language_preferred": lang,
        "covid_vaccination_status": vax
    }

    response = client.post("/auth/sync", json=payload)
    assert response.status_code in [200, 201, 400, 401, 403, 404, 500]



# Fuzz tesing for /auth/user/profile

@given(
    auth_header=st.one_of(
        st.none(),
        st.text(min_size=0, max_size=30).filter(lambda s: '\n' not in s and '\r' not in s)
    )


)
def test_fuzz_get_user_profile(client, auth_header):

    headers = {}
    if auth_header:
        headers["Authorization"] = f"Bearer {auth_header}"

    response = client.get("/auth/user/profile", headers=headers)
    assert response.status_code in [200, 400, 401, 403, 404, 500]


# Fuzz tesing for /auth/user/auth-history

@given(
    auth_header=st.one_of(
        st.none(),
        st.text(min_size=0, max_size=30).filter(lambda s: '\n' not in s and '\r' not in s)
    )

)
def test_fuzz_get_auth_history(client, auth_header):

    headers = {}
    if auth_header:
        headers["Authorization"] = f"Bearer {auth_header}"

    response = client.get("/auth/user/auth-history", headers=headers)
    assert response.status_code in [200, 400, 401, 403, 404, 500]
