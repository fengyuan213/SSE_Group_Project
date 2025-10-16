#!/bin/bash
# Minimal post-setup tasks after Turbo setup completes

# Create .env from example if needed
if [ ! -f .env ] && [ -f env.example ]; then
    cp env.example .env
    echo "✓ Created .env from env.example"
fi

# Configure git safe directory
git config --global --add safe.directory /workspace 2>/dev/null || true
echo "✓ Git configured"

# Setup PostgreSQL environment variables to auto-load in shells
if [ -f .env ]; then
    # Add to ~/.zshrc if not already present
    if [ -f ~/.zshrc ] && ! grep -q "Load PostgreSQL environment variables" ~/.zshrc; then
        cat >> ~/.zshrc << 'EOF'

# Load PostgreSQL environment variables from .env
if [ -f /workspace/.env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        if [[ "$line" =~ ^PG ]]; then
            export "$line"
        fi
    done < /workspace/.env
fi
EOF
        echo "✓ PostgreSQL auto-load added to ~/.zshrc"
    fi

    # Add to ~/.bashrc if not already present
    if [ -f ~/.bashrc ] && ! grep -q "Load PostgreSQL environment variables" ~/.bashrc; then
        cat >> ~/.bashrc << 'EOF'

# Load PostgreSQL environment variables from .env
if [ -f /workspace/.env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        if [[ "$line" =~ ^PG ]]; then
            export "$line"
        fi
    done < /workspace/.env
fi
EOF
        echo "✓ PostgreSQL auto-load added to ~/.bashrc"
    fi

    # Load for current session
    export $(grep -E "^PG" .env | xargs)
    echo "✓ PostgreSQL environment variables loaded for current session"
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

