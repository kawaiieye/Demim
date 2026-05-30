#!/bin/bash
# OSINT Timeline Reconstruction App - Start Script
# Run this to start the app on your own machine

set -e

echo "============================================"
echo "  OSINT Timeline Reconstruction Tool"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Install it from: https://nodejs.org (LTS version recommended)"
    exit 1
fi

echo "Node.js version: $(node --version)"

# Check for bun (preferred) or npm
PKG_MGR=""
if command -v bun &> /dev/null; then
    PKG_MGR="bun"
    echo "Using bun: $(bun --version)"
elif command -v npm &> /dev/null; then
    PKG_MGR="npm"
    echo "Using npm: $(npm --version)"
else
    echo "Error: Neither bun nor npm found. Install one to continue."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies (first run only)..."
    if [ "$PKG_MGR" = "bun" ]; then
        bun install
    else
        npm install
    fi
fi

# Generate Prisma client
echo "Generating database client..."
npx prisma generate

# Push database schema (create SQLite DB if needed)
echo "Setting up database..."
npx prisma db push

# Create necessary directories
mkdir -p cases db

# Start the app
echo ""
echo "Starting OSINT Timeline app..."
echo "Open your browser to: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

if [ "$PKG_MGR" = "bun" ]; then
    bun run dev
else
    npm run dev
fi
