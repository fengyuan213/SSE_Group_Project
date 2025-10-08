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
# Do folloing in the root directory!!!!
npm install
# One command does it all! for setup everything including python venv python libraries, frontended dependencies etc
npm run setup
# This installs all dependencies for BOTH frontend and backend
# Creates Python virtual environment (.venv)
# Sets up everything you need

# Start both servers in parallel!
npm run dev



```

### Configure VS Code Python Interpreter

After setup, configure your Python interpreter:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Python: Select Interpreter"
3. Browse → Select `backend\.venv\Scripts\python.exe` (Windows) or `backend/.venv/bin/python` (Mac/Linux)

### Access Your Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

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
npm run dev        # Start both frontend & backend in parallel
npm run setup      # Setup both projects (install deps, create venv)
npm run build      # Build both projects
npm run clean      # Clean build artifacts and dependencies
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

