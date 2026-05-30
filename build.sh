#!/bin/bash
# Build the app for production use
set -e

echo "Building OSINT Timeline for production..."

# Install dependencies
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Build the standalone production bundle
echo "Creating production build..."
if command -v bun &> /dev/null; then
    bun run build
else
    npm run build
fi

echo ""
echo "Build complete! To run in production mode:"
echo "  npm run start"
echo ""
echo "The app will be available at http://localhost:3000"
