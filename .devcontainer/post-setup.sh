#!/bin/bash
# Minimal post-setup tasks after Turbo setup completes

# Create .env from example if needed
if [ ! -f .env ] && [ -f env.example ]; then
    cp env.example .env
    echo "✓ Created .env from env.example"
fi

# Load all environment variables from .env (excluding comments and empty lines)
if [ -f .env ]; then
    set -a  # Automatically export all variables
    source <(grep -v '^#' .env | grep -v '^$' | sed 's/\r$//')
    set +a  # Stop auto-exporting
    echo "✓ Environment variables loaded from .env"
fi

# Configure Git
git config --global --add safe.directory /workspace 2>/dev/null || true
git config --global commit.gpgsign false 2>/dev/null || true

# Set Git user from .env if available
if [ -f .env ]; then
    # Source Git config from .env
    GIT_USER_NAME=$(grep "^GIT_USER_NAME=" .env | cut -d '=' -f2- | tr -d '"')
    GIT_USER_EMAIL=$(grep "^GIT_USER_EMAIL=" .env | cut -d '=' -f2- | tr -d '"')
fi

# Configure Git user
if [ -n "$GIT_USER_NAME" ] && [ "$GIT_USER_NAME" != "Your Name" ]; then
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
    echo "✓ Git user configured from .env: $GIT_USER_NAME <$GIT_USER_EMAIL>"
elif [ -z "$(git config --global user.name)" ]; then
    # Fallback to placeholder
    git config --global user.name "vscode"
    git config --global user.email "vscode@localhost"
    echo "⚠️  Git user set to default. Please update .env with your Git name and email!"
    echo "   Edit GIT_USER_NAME and GIT_USER_EMAIL in .env"
else
    echo "✓ Git user already configured: $(git config --global user.name)"
fi

echo "✓ Git configured"

# Setup environment variables to auto-load in shells
if [ -f .env ]; then
    # Add to ~/.zshrc if not already present
    if [ -f ~/.zshrc ] && ! grep -q "Load environment variables from .env" ~/.zshrc; then
        cat >> ~/.zshrc << 'EOF'

# Load environment variables from .env
if [ -f /workspace/.env ]; then
    set -a
    source <(grep -v '^#' /workspace/.env | grep -v '^$' | sed 's/\r$//')
    set +a
fi
EOF
        echo "✓ Environment auto-load added to ~/.zshrc"
    fi

    # Add to ~/.bashrc if not already present
    if [ -f ~/.bashrc ] && ! grep -q "Load environment variables from .env" ~/.bashrc; then
        cat >> ~/.bashrc << 'EOF'

# Load environment variables from .env
if [ -f /workspace/.env ]; then
    set -a
    source <(grep -v '^#' /workspace/.env | grep -v '^$' | sed 's/\r$//')
    set +a
fi
EOF
        echo "✓ Environment auto-load added to ~/.bashrc"
    fi
fi

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

