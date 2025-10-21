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

# -----------------------------------------------------------------------------
# 1a. Authenticate GitHub CLI if in Codespaces
# -----------------------------------------------------------------------------
if [ -n "$CODESPACES" ] && [ -n "$GITHUB_TOKEN" ] && command -v gh >/dev/null 2>&1; then
    echo "🔐 Authenticating GitHub CLI with GITHUB_TOKEN..."
    if echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null; then
        echo "✓ GitHub CLI authenticated successfully"
    else
        echo "⚠️  GitHub CLI authentication failed (non-fatal)"
    fi
fi

# -----------------------------------------------------------------------------
# 1b. Determine Git user identity
# -----------------------------------------------------------------------------
# Priority order:
# 1. .env file (for local development)
# 2. GitHub Codespaces + gh API (for real user info)
# 3. Environment variables
# 4. Existing git config
# 5. Fallback defaults



# If not set, try auto-detection
if [ -z "$GIT_USER_NAME" ]; then
    # GitHub Codespaces - use gh API to get real user info
    if [ -n "$CODESPACES" ] && command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
        echo "🔍 Fetching GitHub user info via API..."

        # Get user info from GitHub API
        GIT_USER_NAME=$(gh api user --jq .name 2>/dev/null)
        GIT_USER_EMAIL=$(gh api user --jq .email 2>/dev/null)
        GITHUB_LOGIN=$(gh api user --jq .login 2>/dev/null)

        # If name is null/empty, use GitHub login username
        if [ -z "$GIT_USER_NAME" ] || [ "$GIT_USER_NAME" = "null" ]; then
            GIT_USER_NAME="$GITHUB_LOGIN"
        fi

        # If email is null/empty (user has private email), use proper noreply format
        if [ -z "$GIT_USER_EMAIL" ] || [ "$GIT_USER_EMAIL" = "null" ]; then
            # Get user ID for proper noreply format: ID+username@users.noreply.github.com
            GITHUB_ID=$(gh api user --jq .id 2>/dev/null)
            if [ -n "$GITHUB_ID" ] && [ "$GITHUB_ID" != "null" ]; then
                GIT_USER_EMAIL="${GITHUB_ID}+${GITHUB_LOGIN}@users.noreply.github.com"
            else
                GIT_USER_EMAIL="${GITHUB_LOGIN}@users.noreply.github.com"
            fi
        fi

        echo "✓ Fetched from GitHub API: $GIT_USER_NAME ($GITHUB_LOGIN)"

    # GitHub Actions / Generic Git committer
    elif [ -n "$GIT_COMMITTER_NAME" ] && [ -n "$GIT_COMMITTER_EMAIL" ]; then
        GIT_USER_NAME="$GIT_COMMITTER_NAME"
        GIT_USER_EMAIL="$GIT_COMMITTER_EMAIL"
        echo "✓ Using Git committer environment variables"

    # Fallback: GITHUB_USER without API (Codespaces but gh auth failed)
    elif [ -n "$GITHUB_USER" ]; then
        GIT_USER_NAME="$GITHUB_USER"
        GIT_USER_EMAIL="${GITHUB_USER}@users.noreply.github.com"
        echo "⚠️  Using GITHUB_USER without API lookup"

    # Existing Git config
    elif [ -n "$(git config --global user.name 2>/dev/null)" ]; then
        GIT_USER_NAME=$(git config --global user.name)
        GIT_USER_EMAIL=$(git config --global user.email)
        echo "✓ Using existing git config"

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
    echo "✓ Git configured: $GIT_USER_NAME <$GIT_USER_EMAIL>"
fi

echo "✓ Git setup complete"

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
