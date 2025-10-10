# React + Flask Full-Stack Application

A modern full-stack web application with React (TypeScript) frontend and Flask (Python) backend, managed as a monorepo with Turborepo.

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

### Monorepo Tools
- **Turborepo** - Fast, efficient monorepo build system
- **Node.js scripts** - Automated setup and development workflows

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+) and **npm** (v9+)
- **Python** (v3.10+) and **pip**
- **Git**

### Recommended Setup (Use This!)

**This is the recommended approach** - run everything from the root directory:

```bash
# Clone the repository
git clone https://github.com/fengyuan213/SSE_Group_Project.git
cd SSE_Group_Project

# Setup environment (one-time)
cp env.example .env
# Edit .env with your database credentials

# Install dependencies (one-time)
npm run setup
# This installs all dependencies for BOTH frontend and backend
# Creates Python virtual environment (.venv)
# Sets up everything you need

# Import database schema (one-time)
npm run db:import

# Start both servers in parallel!
npm run dev

# OR run them separately:
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only
```

### Configure VS Code Python Interpreter

After setup, configure your Python interpreter:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Python: Select Interpreter"
3. Browse → Select `backend\.venv\Scripts\python.exe` (Windows) or `backend/.venv/bin/python` (Mac/Linux)

### Access Your Application

- **Frontend:** http://localhost:5173 (configurable via `VITE_PORT` in `.env`)
- **Backend API:** http://localhost:5000 (configurable via `FLASK_PORT` in `.env`)

### Running Services Independently

You can run frontend and backend separately:

```bash
# Terminal 1 - Backend only
npm run dev:backend

# Terminal 2 - Frontend only  
npm run dev:frontend
```

---

## 🗄️ Database Setup

### Prerequisites
- **PostgreSQL** installed locally OR access to a remote PostgreSQL server
- **psql** command-line tool (comes with PostgreSQL)

### Quick Import (3 Steps)

#### 1. Configure Database URL
Create a `.env` file in the **root directory**:

```bash
# Copy the template
cp env.example .env  # Linux/Mac
# OR
copy env.example .env  # Windows

# Edit .env with your database credentials
# (Skip editing if you want to use the default remote shared db)
```

Your `.env` file should contain:
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
```

**Examples:**
```bash
# Remote database (default in template)
DATABASE_URL="postgresql://admin:adminpassword@db.fengy.cc:6666/group_project"

# Local database
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/home_services"
```

> **💡 Monorepo Environment Variables:**  
> The root `.env` file is automatically loaded by:
> - **Turborepo**: Configured in `turbo.json` to pass `DATABASE_URL` to all tasks
> - **npm scripts**: Shell access to `${DATABASE_URL}` from root

#### 2. Import Schema
From the **root folder**, run:

```bash
npm run db:import
```

That's it! The schema will be imported to your configured database.

#### 3. Verify Import
```bash
# Check tables were created
psql "${DATABASE_URL}" -c "\dt"
```

You should see 20+ tables including `users`, `bookings`, `payments`, `feedback`, etc.

---

### Alternative: Direct psql Command

If you prefer not to use npm:

```bash
psql "postgresql://your-connection-string" -f backend/schema/database_schema.sql
```

### Alternative: Using pgAdmin (GUI)
1. Open **pgAdmin**
2. Connect to your PostgreSQL server
3. Right-click on your database → **Query Tool**
4. **File** → **Open** → Select `backend/schema/database_schema.sql`
5. Click **Execute** (▶️) or press `F5`

---

### Schema Features
✅ Auth0 user management with UUID  
✅ Service packages and providers  
✅ Booking system with restrictions  
✅ Payment and confirmation tracking  
✅ Audit logs and feedback  
✅ Sample data included for testing  

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

### Available Scripts

#### Root Level (Monorepo)
```bash
npm run dev              # Start both frontend & backend in parallel
npm run dev:backend      # Start backend only (Flask on port from FLASK_PORT)
npm run dev:frontend     # Start frontend only (Vite on port from VITE_PORT)
npm run setup            # Setup both projects (install deps, create venv)
npm run build            # Build both projects
npm run clean            # Clean build artifacts and dependencies
npm run db:import        # Import database schema (uses DATABASE_URL from .env)
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

| Branch | Purpose | Merge To |
|--------|---------|----------|
| `main` | Production-ready code | - |
| `dev` | Integration & testing | `main` |
| `feature/*` | New features | `dev` |
| `bugfix/*` | Bug fixes | `dev` |
| `hotfix/*` | Critical fixes | `main` + `dev` |

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
Recommended Approach: task: 1.1                  # Assigned Task on the google doc document
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

## 🐛 Troubleshooting

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

