import os
from flask import Flask
from flask_cors import CORS
from .api import api_bp

def create_app():
    app = Flask(__name__)
    # CORS for the Vite dev server
    CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGIN", "*")}})
    app.register_blueprint(api_bp, url_prefix="/api")

    # Optional root route so clicking the server link doesn't 404
    @app.get("/")
    def root():
        return "Backend is running. Try /api/health"

    return app

app = create_app()
