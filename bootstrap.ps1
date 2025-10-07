$ErrorActionPreference = "Stop"

# --- repo root ---
if (-not (Test-Path .git)) { git init | Out-Null }

# --- folders ---
New-Item -ItemType Directory -Force -Path frontend | Out-Null
New-Item -ItemType Directory -Force -Path backend\app | Out-Null
New-Item -ItemType Directory -Force -Path .vscode | Out-Null
<#Uncomment the below for frontend only. Comment it out again before backend
# --- frontend: vite react-ts ---
Push-Location frontend
npm create vite@latest . -- --template react-ts
npm i axios react-router-dom
@"
VITE_API_URL=http://localhost:5000
"@ | Set-Content .env

New-Item -ItemType Directory -Force -Path src\lib | Out-Null
@"
import axios from "axios";
export const api = axios.create({
  baseURL: \`\${import.meta.env.VITE_API_URL}/api\`,
});
"@ | Set-Content src\lib\api.ts

@"
import { useEffect, useState } from "react";
import { api } from "./lib/api";

export default function App() {
  const [status, setStatus] = useState("checking...");
  useEffect(() => {
    api.get("/health")
      .then(r => setStatus(r.data.status))
      .catch(() => setStatus("down"));
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h1>React + Flask (no DB)</h1>
      <p>API status: {status}</p>
    </div>
  );
}
"@ | Set-Content src\App.tsx

# Add build/lint scripts if missing
(Get-Content package.json) -replace '"dev": "vite"', '"dev":"vite","build":"tsc -b && vite build","preview":"vite preview","lint":"eslint . --ext .ts,.tsx"' | Set-Content package.json
Pop-Location
#>

# --- backend: flask (no database) ---
Push-Location backend
python -m venv .venv
& .\.venv\Scripts\python -m pip install --upgrade pip
& .\.venv\Scripts\pip install flask flask-cors python-dotenv
& .\.venv\Scripts\pip freeze | Set-Content requirements.txt

@"
FLASK_APP=app
FLASK_ENV=development
CORS_ORIGIN=http://localhost:5173
"@ | Set-Content .env

@"
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
"@ | Set-Content app\__init__.py

@"
from flask import Blueprint, jsonify
api_bp = Blueprint("api", __name__)

@api_bp.get("/health")
def health():
    return jsonify({"status": "ok"})
"@ | Set-Content app\api.py
Pop-Location

# --- VS Code debug configs (F5 to run both) ---
@"
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Frontend: npm dev",
      "type": "shell",
      "command": "npm run dev",
      "options": { "cwd": "\${workspaceFolder}/frontend" },
      "problemMatcher": []
    },
    {
      "label": "Backend: flask run",
      "type": "shell",
      "command": ".\\.venv\\Scripts\\activate; flask run --port 5000",
      "options": { "cwd": "\${workspaceFolder}/backend" },
      "problemMatcher": []
    }
  ]
}
"@ | Set-Content .vscode\tasks.json

@"
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: Flask (debugpy)",
      "type": "python",
      "request": "launch",
      "program": "\${workspaceFolder}/backend/.venv/Scripts/flask.exe",
      "args": [
        "run",
        "--port", "5000"
      ],
      "python": "\${workspaceFolder}/backend/.venv/Scripts/python.exe",
      "envFile": "\${workspaceFolder}/backend/.env",
      "cwd": "\${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "justMyCode": true
    },
    {
      "name": "Frontend: Vite dev",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "\${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Run Both: Frontend + Backend",
      "configurations": ["Backend: Flask (debugpy)", "Frontend: Vite dev"]
    }
  ]
}
"@ | Set-Content .vscode\launch.json

# --- root files ---
@"
# Node
frontend/node_modules/
frontend/dist/

# Python
backend/.venv/
backend/__pycache__/
backend/*.pyc

# Envs
**/.env

# OS
.DS_Store
*.log
"@ | Set-Content .gitignore

@"
# React + Flask (no database)

## Start (from VS Code)
- Select Python interpreter: \`backend\\.venv\\Scripts\\python.exe\`
- Press **F5** and choose **Run Both: Frontend + Backend**
  - Frontend: http://localhost:5173
  - Backend:  http://localhost:5000/api/health

## Manual run (terminals)
Backend:
  cd backend
  .\\.venv\\Scripts\\activate
  flask run --port 5000

Frontend:
  cd frontend
  npm run dev
"@ | Set-Content README.md

