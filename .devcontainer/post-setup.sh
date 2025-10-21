#!/bin/bash
# Minimal post-setup tasks after Turbo setup completes
set -e

# -----------------------------------------------------------------------------
# 1. Create .env files from env.example (root, backend, frontend)
# -----------------------------------------------------------------------------
for d in . backend frontend; do
    if [ ! -f "$d/.env" ] && [ -f "$d/env.example" ]; then
        cp "$d/env.example" "$d/.env"
        echo "✓ Created $d/.env from $d/env.example"
    fi
done

# -----------------------------------------------------------------------------
# 2. Load root .env file (safe parsing)
# -----------------------------------------------------------------------------
if [ -f .env ]; then
    # Load non-commented, non-empty lines safely
    set -a
    # shellcheck disable=SC2046
    export $(grep -v '^[#[:space:]]' .env | sed 's/\r$//' | xargs -0 -n1)
    set +a
    echo "✓ Environment variables loaded from .env"
fi

# -----------------------------------------------------------------------------
# 3. Git configuration and user detection
# -----------------------------------------------------------------------------
git config --global --add safe.directory /workspace 2>/dev/null || true
git config --global commit.gpgsign false 2>/dev/null || true

# Prefer values already loaded from .env
if [ -z "$GIT_USER_NAME" ]; then
    # Codespaces / GitHub Actions
    if [ -n "$GIT_COMMITTER_NAME" ] && [ -n "$GIT_COMMITTER_EMAIL" ]; then
        GIT_USER_NAME="$GIT_COMMITTER_NAME"
        GIT_USER_EMAIL="$GIT_COMMITTER_EMAIL"

    # GitHub CLI (authenticated)
    elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
        GIT_USER_NAME=$(gh api user --jq .login 2>/dev/null)
        GIT_USER_EMAIL="${GIT_USER_NAME}@users.noreply.github.com"

    # Existing Git config
    elif [ -n "$(git config --global user.name 2>/dev/null)" ]; then
        GIT_USER_NAME=$(git config --global user.name)
        GIT_USER_EMAIL=$(git config --global user.email)

    # Fallback defaults
    else
        GIT_USER_NAME="vscode"
        GIT_USER_EMAIL="vscode@localhost"
        echo "⚠️  No Git identity found. Defaulting to vscode@localhost"
    fi
fi

# Apply Git identity if found
if [ -n "$GIT_USER_NAME" ]; then
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
    echo "✓ Git user automatically set: $GIT_USER_NAME <$GIT_USER_EMAIL>"
fi

echo "✓ Git configured"

# -----------------------------------------------------------------------------
# 4. Auto-load .env in future shells (~/.bashrc and ~/.zshrc)
# -----------------------------------------------------------------------------
if [ -f .env ]; then
    ENV_LOAD_BLOCK=$(cat <<'EOF'

# Load environment variables from /workspace/.env
if [ -f /workspace/.env ]; then
    set -a
    source <(grep -v '^[#[:space:]]' /workspace/.env | sed 's/\r$//')
    set +a
fi
EOF
)

    # Add to ~/.zshrc if not already present
    if [ -f ~/.zshrc ] && ! grep -q "Load environment variables from /workspace/.env" ~/.zshrc; then
        echo "$ENV_LOAD_BLOCK" >> ~/.zshrc
        echo "✓ Environment auto-load added to ~/.zshrc"
    fi

    # Add to ~/.bashrc if not already present
    if [ -f ~/.bashrc ] && ! grep -q "Load environment variables from /workspace/.env" ~/.bashrc; then
        echo "$ENV_LOAD_BLOCK" >> ~/.bashrc
        echo "✓ Environment auto-load added to ~/.bashrc"
    fi
fi

echo "✅ Post-setup completed successfully."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Development environment ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Quick start:"
echo "  npm run dev          - Start frontend and backend"
echo "  npm run dev:frontend - Start frontend only"
echo "  npm run dev:backend  - Start backend only"
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo ""

