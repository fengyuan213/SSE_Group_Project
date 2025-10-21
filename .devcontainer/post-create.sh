#!/bin/bash
# Runs automatically after DevContainer creation, BEFORE npm run setup
# This script prepares the environment for installation
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Running post-create setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# -----------------------------------------------------------------------------
# 1. Git configuration (must happen BEFORE git pull)
# -----------------------------------------------------------------------------
git config --global --add safe.directory /workspace 2>/dev/null || true
git config --global commit.gpgsign false 2>/dev/null || true

# Set Git user identity from .env if exists, or use defaults
if [ -f .env ]; then
    GIT_USER_NAME=$(grep -E '^GIT_USER_NAME=' .env | cut -d '=' -f2- | tr -d '"' | sed 's/\r$//' 2>/dev/null || echo "")
    GIT_USER_EMAIL=$(grep -E '^GIT_USER_EMAIL=' .env | cut -d '=' -f2- | tr -d '"' | sed 's/\r$//' 2>/dev/null || echo "")
fi

# Fallback to environment variables or defaults
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

# Apply Git identity
if [ -n "$GIT_USER_NAME" ]; then
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
    echo "✓ Git user configured: $GIT_USER_NAME <$GIT_USER_EMAIL>"
fi

echo "✓ Git configured"

# -----------------------------------------------------------------------------
# 2. Git pull latest changes on current branch
# -----------------------------------------------------------------------------
if git rev-parse --git-dir > /dev/null 2>&1; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

    # Check if current branch has an upstream
    if git rev-parse --abbrev-ref --symbolic-full-name @{u} > /dev/null 2>&1; then
        echo "Pulling latest changes from $CURRENT_BRANCH..."
        if git pull --rebase; then
            echo "✓ Successfully pulled latest changes"
        else
            echo "⚠️  Git pull failed. You may need to resolve conflicts manually."
        fi
    else
        echo "⚠️  No upstream branch configured for $CURRENT_BRANCH. Skipping git pull."
    fi
else
    echo "⚠️  Not in a git repository. Skipping git pull."
fi

# -----------------------------------------------------------------------------
# 3. Create .env files from env.example (if they don't exist)
# -----------------------------------------------------------------------------
for d in . backend frontend; do
    if [ ! -f "$d/.env" ] && [ -f "$d/env.example" ]; then
        cp "$d/env.example" "$d/.env"
        echo "✓ Created $d/.env from $d/env.example"
    fi
done

echo ""
echo "✓ Post-create setup complete!"
echo "  → Now running npm run setup..."
echo ""
