# React + Flask Full-Stack Application

A modern full-stack web application with React (TypeScript) frontend and Flask (Python) backend.

## 📦 Tech Stack

### Frontend
- **React 19** - Latest React with modern features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **ESLint** - Code quality and linting
- **turbo** - Mono-repo management

### Backend
- **Flask 3.1.2** - Python web framework
- **Flask-CORS** - Handle Cross-Origin Resource Sharing
- **Python 3.15.2** - Latest Python version

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+) and **npm** (v9+)
- **Python** (v3.10+) and **pip**
- **Git**

### Setup

```bash
# Clone the repository
git clone https://github.com/fengyuan213/SSE_Group_Project.git
cd SSE_Group_Project

# Install root dependencies
npm install

# Setup frontend and backend
npm setup

# Configure VS Code Python Interpreter
# Ctrl+Shift+P → "Python: Select Interpreter" → backend\.venv\Scripts\python.exe

# Start developing!
npm run dev
```


**Manually Backend**
   ```bash
   cd backend
   # on windows
   python -m venv .venv
   .\.venv\Scripts\activate
   # on mac
   python -m venv .venv
   ./.venv/bin/activate
   cd ..

   ```

```bash
# run
flask run --port 5000
```
Package management
   pip install package-name   # Install new Python package
   pip freeze > requirements.txt  # Update requirements.txt

**Configure VS Code Python Interpreter**
   - Press `Ctrl+Shift+P` → "Python: Select Interpreter"
   - Browse → Select `backend\.venv\Scripts\python.exe` or `backend\.venv\bin\python.exe`

**"Where do I install frontend packages?"**
```bash
# ALWAYS cd into frontend first!
cd frontend
npm install package-name

# run
npm run dev
# DON'T install React packages in root
# Root is only for monorepo tools (Turborepo)
```


Visit:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api/




### Production
After building frontend with `npm run build`, Flask serves both:
- Static files (React app) at `/`
- API endpoints at `/api/*`

To deploy:
```bash
cd frontend
npm run build

cd ../backend
flask run
# Visit http://localhost:5000
```


### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Root (Monorepo)                       │
│  • Contains Turborepo (runs both servers in parallel)   │
│  • Shared scripts for development                       │
└─────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│   Frontend Package   │      │   Backend (Python)   │
│   • React + Vite     │      │   • Flask API        │
│   • Port 5173        │      │   • Port 5000        │
│   • TypeScript       │      │   • Virtual env      │
│   • Own node_modules │      │   • Own .venv        │
└──────────────────────┘      └──────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          ▼
              Vite Proxy: /api/* → Flask
```




### ESLint not working
- Install VS Code ESLint extension
- ESLint working directory is set to `./frontend`
