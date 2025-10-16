#!/bin/bash

# Script that runs automatically after DevContainer creation
# This script executes after the container is created to setup the development environment

set -e  # Exit immediately on error

#!/bin/bash
# Simple post-setup tasks that run after npm dependencies are installed


# 7. Configure Git
echo ""
echo "🔧 Configuring Git..."
git config --global --add safe.directory /workspace
print_success "Git configuration complete"

# 8. Completion message
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Development environment setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 You can now start developing!"
echo ""
echo "Common commands:"
echo "  npm run dev          - Start both frontend and backend"
echo "  npm run dev:frontend - Start frontend only"
echo "  npm run dev:backend  - Start backend only"
echo "  npm run build        - Build the project"
echo "  npm run lint         - Run code linting"
echo ""
echo "Database connection:"
echo "  Host: db"
echo "  Port: 5432"
echo "  Database: sse_project"
echo "  Username: postgres"
echo "  Password: postgres"
echo ""
echo "pgAdmin (Database Management UI):"
echo "  URL: http://localhost:5050"
echo "  Email: admin@admin.com"
echo "  Password: admin"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


