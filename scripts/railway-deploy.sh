#!/bin/bash
# Railway Deploy Script
# This script handles the PostgreSQL schema swap for Railway deployment

set -e

echo "=== Railway Deploy Setup ==="

# Swap to PostgreSQL schema for production
echo "Swapping to PostgreSQL schema..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Push schema to database (creates/updates tables)
echo "Pushing schema to database..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "db push failed, trying force reset..."
  npx prisma db push --force-reset --accept-data-loss 2>&1
}

# Build Next.js
echo "Building Next.js..."
npx next build

echo "=== Deploy Setup Complete ==="
