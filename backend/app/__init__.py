import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file in workspace root FIRST
# This must happen before importing other modules that use environment variables
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from flask import Flask
from flask_cors import CORS

from .api import api_bp
from .routes.auth_routes import auth_bp
from .routes.admin_routes import admin_bp


def create_app():
    app = Flask(__name__)
    # CORS for the Vite dev server
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": os.getenv("CORS_ORIGIN", "*"),
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # Optional root route so clicking the server link doesn't 404
    @app.get("/")
    def root():
        return "Backend is running. Try /api/health"

    return app


app = create_app()
