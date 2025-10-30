#!/bin/bash
# Runs after npm run setup completes (called by 'npm run setup')
# This script finalizes the environment after dependencies are installed
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Running post-setup finalization..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# -----------------------------------------------------------------------------
# 1. Load root .env file for current session
# -----------------------------------------------------------------------------
if [ -f .env ]; then
    # Load non-commented, non-empty lines safely
    # Only export lines that match KEY=VALUE format
    set -a
    source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | sed 's/\r$//')
    set +a
    echo "✓ Environment variables loaded from .env"
fi

# -----------------------------------------------------------------------------
# 2. Auto-load .env in future shells (~/.bashrc and ~/.zshrc)
# -----------------------------------------------------------------------------
if [ -f .env ]; then
    ENV_LOAD_BLOCK=$(cat <<'EOF'

# Load environment variables from /workspace/.env
if [ -f /workspace/.env ]; then
    set -a
    source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' /workspace/.env | sed 's/\r$//')
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

# loading from .env environment variables
# # Try .env file first (highest priority for local dev)
# if [ -f .env ]; then
#     GIT_USER_NAME=$(grep -E '^GIT_USER_NAME=' .env | cut -d '=' -f2- | tr -d '"' | sed 's/\r$//' 2>/dev/null || echo "")
#     GIT_USER_EMAIL=$(grep -E '^GIT_USER_EMAIL=' .env | cut -d '=' -f2- | tr -d '"' | sed 's/\r$//' 2>/dev/null || echo "")
#     if [ -n "$GIT_USER_NAME" ]; then
#         echo "✓ Using Git identity from .env file"
#     fi
# fi

echo ""
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
