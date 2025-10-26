BACKEND TESTING

Commands to run test files separately
cd /workspace/backend
source .venv/bin/activate
pytest -v -s tests/test_api.py
pytest -v -s tests/test_security_features.py
pytest -v -s tests/test_fuzz_api.py
pytest -v -s tests/test_integration.py 
