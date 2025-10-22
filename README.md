# React + Flask Full-Stack Application

A modern full-stack web application with React (TypeScript) frontend and Flask (Python) backend, running in a Docker DevContainer environment with PostgreSQL database.

## 📦 Tech Stack

### Frontend

- **React 19** - Latest React with modern features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **ESLint** - Code quality and linting

### Backend

- **Flask 3.1.2** - Python web framework
- **Flask-CORS** - Handle Cross-Origin Resource Sharing
- **Python 3.13** - Latest Python version
- **Pylint & Pyright** - Linting and type checking

### DevOps & Infrastructure

- **Docker & DevContainer** - Containerized development environment
- **PostgreSQL 16** - Production-ready database with automatic schema initialization
- **Turborepo** - Fast, efficient monorepo build system
- **Node.js scripts** - Automated setup and development workflows

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** or **Docker Engine** with Docker Compose
  Setup docker goto https://www.docker.com/ download and install docker desktop

**⚡ Docker Optimization:**

- **First-time setup with pre-built image:** ~2-3 minutes (pulls image + installs deps)
- **First-time setup without image:** ~10-15 minutes (builds image + installs deps)
- **Subsequent starts:** ~10 seconds (everything is cached)
- **VS Code** with **Dev Containers extension** (recommended)
- **Git**

### Recommended Setup - when setup locally

```bash
#codespace automatically configure it so it would be fine
git config --global user.name "yourgithubname"
git config --global user.email "youremail@example.com"

```

**This is the recommended approach** - uses Docker for consistent development environment:

```bash
# 1. Clone the repository
git clone https://github.com/fengyuan213/SSE_Group_Project.git
cd SSE_Group_Project


# 2. Open in VS Code
code .

# 3. VS Code will detect the devcontainer and prompt you to "Reopen in Container"
# Click "Reopen in Container" and wait for the setup to complete
# This automatically:
#   • Pulls pre-built Docker image from GitHub Container Registry (30 seconds) ⚡
#   • OR builds from Dockerfile if image unavailable (5-10 minutes)
#   • Starts PostgreSQL database in Docker
#   • Creates Python virtual environment (.venv)
#   • Installs all frontend and backend dependencies
#   • Imports database schema automatically
#   • Configures PostgreSQL environment variables
#   • Installs 40+ recommended VS Code extensions automatically


# 4. Edit .env and set your Git credentials (IMPORTANT!) Ignore if you do not plan to use git inside container
# Update these lines in .env:
#   GIT_USER_NAME="Your Name"
#   GIT_USER_EMAIL="your.email@example.com"
# Note: .env is loaded during container setup. To apply changes later, see "Updating .env" section.

# after edit, use this to make the change take effect
set -a &&  source <(grep -v '^#' .env | grep -v '^$' | sed 's/\r$//') && set +a  # auto export .env


```

### 🔌 Extensions

I have already built in some extensions installed on the container side to boost-up development process
I also having some local extension help you as well(for example, pdf viewer, view pdf vscode). To install via:

1. Open VS Code Command Palette (`Cmd/Ctrl+Shift+P`)
2. Type "Extensions: Show Recommended Extensions"
3. Click "Install All" or install individually

## <details>

Once the container is ready:

```bash
# Start both servers in parallel!
npm run dev

# OR run them separately:
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only

# Access psql without arguments (env vars are auto-configured):
psql
# note that if you messed up with db or configured something wrong, you can use
npm run db:import
# This will import the definitions from backend/schema/database_schema.sql and it will remove all of the previous definition.

# Start developing!
# Sections below are for understanding, some of the command is already done in the setup phrase
```

### Available Scripts

#### Root Level (Monorepo)

```bash
npm run dev              # Start both frontend & backend in parallel
npm run dev:backend      # Start backend only (Flask on port from FLASK_PORT)
npm run dev:frontend     # Start frontend only (Vite on port from VITE_PORT)
npm run setup            # Setup both projects (install deps, create venv)
npm run build            # Build both projects
npm run clean            # Clean build artifacts (preserves node_modules & .venv contents for Docker volumes)
npm run db:import        # Import database schema (uses DATABASE_URL from .env) very useful if you messedup with the database, restore into a clean one, it will import database_schema.sql in backend/schema/database_schema.sql
```

#### Frontend Only

```bash
cd frontend
npm install <package-name>   # Install new frontend dependency
npm run dev                  # Start Vite dev server
npm run build               # Build production bundle
npm run lint                # Run ESLint
```

#### Backend Only

```bash
cd backend
python -m flask run --port 5000    # Start Flask dev server
pylint app                         # Run Pylint
pyright                            # Run Pyright type checking

# Python package management
source .venv/bin/activate            # Mac/Linux
.venv\Scripts\activate               # Windows
pip install <package-name>           # Install new package
pip freeze > requirements.txt        # Update requirements.txt
```

### Access Your Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 🗄️ Database Setup

### Docker Environment (Automatic ✅)

If using **DevContainer** (recommended), the database is **automatically configured**:

- ✅ PostgreSQL 16 container starts automatically
- ✅ Database schema imported on first run
- ✅ Data persists in Docker volume `postgres-data`
- ✅ PostgreSQL environment variables auto-configured in your shell

**Connection Details (DevContainer):**

```bash
Host:     db
Port:     5432
Database: sse_project
Username: postgres
Password: postgres
```

**Using psql in DevContainer:**

```bash
# Simply run psql (env vars are auto-configured):
psql

# Or with explicit parameters:
psql -h db -U postgres -d sse_project
```

**Database persistence:**

- Container restarts: ✅ Data persists
- Container stop/start: ✅ Data persists
- Remove volume: ❌ Data lost (requires re-import)

To reset database:

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Restart - schema auto-imports
```

---

### Local Environment (Manual Setup)

For local PostgreSQL installation:

#### 1. Configure Database URL

Create a `.env` file in the **root directory**:

```bash
# Copy the template
cp env.example .env

# Edit .env with your database credentials
```

Your `.env` file should contain:

```bash
DATABASE_URL="postgresql://username:password@host:port/database"

# PostgreSQL Client Environment Variables (for psql without arguments)
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGDATABASE=your_database
PGPASSWORD=your_password
```

**Examples:**

```bash
# Local database
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/sse_project"

# Remote database
DATABASE_URL="postgresql://admin:adminpassword@db.fengy.cc:6666/group_project"
```

#### 2. Import Schema

From the **root folder**, run:

```bash
npm run db:import
```

#### 3. Verify Import

```bash
# Check tables were created
psql "${DATABASE_URL}" -c "\dt"

# Or if PG environment variables are configured:
psql -c "\dt"
```

You should see 22 tables including `users`, `bookings`, `payments`, `feedback`, etc.

---

### Alternative: Direct psql Command

If you prefer not to use npm:

```bash
psql "postgresql://your-connection-string" -f backend/schema/database_schema.sql
```

### Schema Features

✅ Auth0 user management with UUID
✅ Service packages and providers
✅ Booking system with restrictions
✅ Payment and confirmation tracking
✅ Audit logs and feedback
✅ Sample data included for testing

### Database Schema Location

- **Schema file:** `backend/schema/database_schema.sql`
- **Auto-import:** Configured in `docker-compose.yml` via `/docker-entrypoint-initdb.d`
- **Manual import:** `npm run db:import` or `backend/scripts/init-db.js`

---

## 🔐 Environment Variables in Monorepo

### How It Works

The root `.env` file is shared across all packages:

```
Root .env
    ├─→ Backend (Flask)
    │   └─ dev.js reads FLASK_PORT → flask run --port 5000
    │
    ├─→ Frontend (Vite)
    │   ├─ vite.config.ts reads VITE_PORT → server port
    │   └─ vite.config.ts reads FLASK_PORT → proxy target
    │
    ├─→ Turborepo Tasks
    │   └─ Configured in turbo.json
    │   └─ Passes DATABASE_URL, FLASK_PORT, VITE_PORT to all tasks
    │
    └─→ Root npm scripts
        └─ Shell access: ${DATABASE_URL}
        └─ Example: npm run db:import
```

### Adding New Environment Variables

1. **Add to `env.example`** (for documentation)
2. **Add to `turbo.json`** under `globalEnv` (if needed by tasks)
3. **Update your `.env`** with the actual value

Example:

```bash
# In env.example
NEW_API_KEY="your-api-key-here"

# In turbo.json
"globalEnv": ["DATABASE_URL", "NODE_ENV", "NEW_API_KEY"]
```

### Port Configuration

Both frontend and backend ports are configurable via `.env`:

```bash
# .env
FLASK_PORT=5000    # Backend Flask server port
VITE_PORT=5173     # Frontend Vite dev server port
```

**How it works:**

- `backend/scripts/dev.js` reads `FLASK_PORT` and starts Flask on that port
- `frontend/vite.config.ts` reads `VITE_PORT` for the dev server
- Vite proxy automatically uses `FLASK_PORT` to connect to backend

**Example - Run on different ports:**

```bash
# In .env
FLASK_PORT=3000
VITE_PORT=8080

# Start servers
npm run dev

# Access:
# Frontend: http://localhost:8080
# Backend:  http://localhost:3000
```

### Frontend Environment Variables

Vite requires the `VITE_` prefix for client-side access:

```bash
# .env
VITE_API_URL="http://localhost:5000"  # ✅ Accessible in React
DATABASE_URL="postgresql://..."        # ❌ Not accessible in React (backend only)
```

Access in React:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## ⚙️ Configuration Files

### VS Code Settings

The project uses two configuration approaches:

**1. `.devcontainer/devcontainer.json` (DevContainer - Recommended)**

- Auto-installs 40+ extensions
- Configures Python interpreter, formatters, linters
- Sets editor defaults (tabs, EOL, format on save)
- **Used when:** Working in DevContainer (recommended setup)

**2. `.vscode/settings.json` (Local Workspace)**

- Workspace-specific settings (Python paths, ESLint directories)
- File exclusions and search settings
- **Used when:** Working locally without Docker

**3. `.vscode/extensions.json` (Optional Local Extensions)**

- Additional extensions for local development (CSV viewer, icons, PDF viewer)
- Most extensions are in `devcontainer.json`

**Summary:**

- ✅ **DevContainer users:** Everything is automatic, no configuration needed
- ⚠️ **Local users:** Need to manually install extensions and configure settings

---

## 🛠️ Development

### Project Structure

```
SSE_Group_Project/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx
│   │   └── lib/
│   │       └── api.ts    # Axios instance for API calls
│   ├── package.json
│   └── vite.config.ts
│
├── backend/               # Flask Python backend
│   ├── app/
│   │   ├── __init__.py   # Flask app factory
│   │   └── api.py        # API routes
│   ├── .venv/            # Python virtual environment
│   ├── requirements.txt  # Python dependencies
│   ├── pyproject.toml    # Python config (Pylint, Pyright)
│   └── package.json      # Scripts for Python workflows
│
├── package.json          # Root monorepo scripts
└── turbo.json            # Turborepo configuration
```

### Alternative: Manual Setup (NOT RECOMMANDED AT ALL, for understanding only )

If the automated setup fails, you can manually set up:

```bash
# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate              # Windows
source .venv/bin/activate           # Mac/Linux
pip install -r requirements.txt
cd ..

# Start development
npm run dev  # Run from root directory
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Root (Monorepo)                       │
│  • Turborepo orchestration                              │
│  • Runs both servers in parallel                        │
│  • Shared development scripts                           │
└─────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│   Frontend Package   │      │   Backend Package    │
│   • React + Vite     │      │   • Flask API        │
│   • Port 5173        │      │   • Port 5000        │
│   • TypeScript       │      │   • Python + .venv   │
│   • Own node_modules │      │   • Own dependencies │
└──────────────────────┘      └──────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          ▼
              Vite Proxy: /api/* → Flask
```

### How It Works

1. **Development Mode:**

   - Frontend runs on `http://localhost:5173` (Vite dev server)
   - Backend runs on `http://localhost:5000` (Flask dev server)
   - Vite proxies `/api/*` requests to Flask (configured in `vite.config.ts`)

2. **Production Mode:**
   - Frontend builds to static files (`frontend/dist`)
   - Flask serves both static files and API endpoints
   - Single server on port 5000

---

## 🌿 Git Workflow

We use a **three-tier branching strategy**: `main` ← `dev` ← `feature/*`

### Branch Structure

| Branch      | Purpose               | Merge To       |
| ----------- | --------------------- | -------------- |
| `main`      | Production-ready code | -              |
| `dev`       | Integration & testing | `main`         |
| `feature/*` | New features          | `dev`          |
| `bugfix/*`  | Bug fixes             | `dev`          |
| `hotfix/*`  | Critical fixes        | `main` + `dev` |

### Daily Workflow

```bash
# 1. Start new feature
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# 2. Work and commit (use conventional commits)
git add .
git commit -m "feat: add user login"
git push origin feature/your-feature-name

# 3. Create Pull Request on GitHub
#    feature/your-feature → dev
#    Get 1+ approval, then merge (squash & merge)

# 4. Clean up
git checkout dev
git pull origin dev
git branch -d feature/your-feature-name
```

### Pull Requests

**Feature → Dev**

- **Who:** Any team member
- **Reviews:** Minimum 1 approval
- **Merge:** Squash and merge
- **After:** Delete feature branch

**Dev → Main (Release)**

- **Who:** Team lead
- **Reviews:** All team members
- **Tests:** Must pass all checks
- **Merge:** Create merge commit
- **After:** Tag release (e.g., `v1.0.0`)

### Commit Format

Recommended Approach: task: 1.1 # Assigned Task on the google doc document
Use [Conventional Commits](https://www.conventionalcommits.org/) if possible:

```bash
feat: add feature          # New feature
fix: resolve bug           # Bug fix
docs: update README        # Documentation
refactor: restructure code # Code refactoring
style: format code         # Formatting
test: add tests            # Tests

```

### Rules ⚠️

1. ❌ Never commit directly to `main` or `dev`
2. ✅ Always use Pull Requests
3. ✅ NOTIFY GROUP before merging
4. ✅ Delete branches after merge
5. ✅ Keep feature branches focused and small

---

## 🚢 Production Build

Build both frontend and backend for production:

```bash
# Build frontend
cd frontend
npm run build
# Creates: frontend/dist/

# Start Flask (serves both frontend and API)
cd ../backend
flask run
# Visit: http://localhost:5000
```

Flask automatically serves:

- Static files (React app) at `/`
- API endpoints at `/api/*`

---

**Database connection fails:**

```bash
# Check database is running
docker ps | grep postgres

# Check database is ready
pg_isready -h db -U postgres

# Verify environment variables
env | grep PG

# Test connection
psql -c "SELECT version();"
```

**Reset everything:**

```bash
# Remove all containers and volumes
docker compose down -v

# Pull latest pre-built image
docker pull ghcr.io/fengyuan213/sse_group_project/devcontainer:latest

# Reopen in container (VS Code will use the latest image)
```

**Image pull fails (private registry):**

```bash
# Login to GitHub Container Registry
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# Use a Personal Access Token (classic) with 'read:packages' scope as password

# Or make the image public (see Docker Image Registry section above)
```

**Force rebuild instead of using pre-built image:**

```bash
# Remove the image line from docker-compose.yml temporarily, or:
docker compose build --no-cache
```

### ESLint Not Working

- Install **VS Code ESLint extension**
- ESLint working directory is set to `./frontend`
- Restart VS Code after installation

### Python Import Errors

- Ensure you've selected the correct Python interpreter (see setup above)
- Activate virtual environment: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Mac/Linux)
- Reinstall dependencies: `pip install -r requirements.txt`

### Port Already in Use

```bash
# Windows - kill process on port 5000 or 5173
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux - kill process on port 5000 or 5173
lsof -ti:5000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Vite Proxy Not Working

- Check `frontend/vite.config.ts` proxy configuration
- Ensure backend is running on port 5000
- Restart both servers with `npm run dev` from root

### Module Not Found Errors

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Turborepo Documentation](https://turbo.build/repo)
- [Conventional Commits](https://www.conventionalcommits.org/)

---
