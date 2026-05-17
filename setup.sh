#!/bin/bash
set -e

echo "=== NIDHIVAN CRM Setup ==="

# Step 1: Start Docker services
echo ""
echo "Step 1: Starting PostgreSQL + Redis..."
docker compose up postgres redis -d
echo "Waiting for postgres to be ready..."
sleep 5

# Step 2: Install all dependencies from root
echo ""
echo "Step 2: Installing dependencies..."
npm install

# Step 3: Migrate DB and seed
echo ""
echo "Step 3: Running database migrations..."
cd apps/api
cp -n .env.example .env || true
npm run db:migrate -- --name init
echo "Seeding team members..."
npm run db:seed
cd ../..

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Start the API:      cd apps/api && npm run dev"
echo "Start the frontend: cd apps/web && npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo "Login: rishabh@nidhivanproperty.com / Nidhivan@2024"
