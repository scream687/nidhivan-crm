# NIDHIVAN CRM — Getting Started

## Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)
- npm or yarn

## Step 1: Start Database + Redis

```bash
cd ~/Desktop/nidhivan-crm
docker compose up postgres redis -d
```

## Step 2: Set up API environment

```bash
cd apps/api
cp .env.example .env
# Edit .env if needed (defaults work out of the box with Docker)
```

## Step 3: Install dependencies

```bash
# From root
cd ~/Desktop/nidhivan-crm
npm install
```

## Step 4: Run database migrations + seed team

```bash
cd apps/api
npx prisma migrate dev --name init
npx ts-node -r tsconfig-paths/register prisma/seed.ts
```

## Step 5: Start the API

```bash
cd apps/api
npm run dev
# API runs at http://localhost:4000
```

## Step 6: Start the frontend (new terminal)

```bash
cd apps/web
cp .env.local.example .env.local
npm run dev
# Frontend runs at http://localhost:3000
```

## Login Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Rishabh Sharma | nidhivanproperty@gmail.com | Nidhivan@2024 | Admin |
| Dolly Sharma | dolly@nidhivanproperty.com | Nidhivan@2024 | Sales Agent |
| Archana | archana@nidhivanproperty.com | Nidhivan@2024 | Sales Agent |
| Sandhya Rajput | sandhya@nidhivanproperty.com | Nidhivan@2024 | Sales Agent |
| Uma Joshi | uma@nidhivanproperty.com | Nidhivan@2024 | Sales Agent |
| Rashi | rashi@nidhivanproperty.com | Nidhivan@2024 | Telecaller |
| Khushi Agnihotri | khushi@nidhivanproperty.com | Nidhivan@2024 | Telecaller |
| Anushka | anushka@nidhivanproperty.com | Nidhivan@2024 | Telecaller |

## Pages

| URL | Description |
|-----|-------------|
| /login | Login |
| / or /leads | Leads Kanban + List |
| /leads/[id] | Lead 360° Detail |
| /telephony | Call Logs |
| /employees | Team Leaderboard |
| /reports | Analytics & Export |

## Phase 2 (Next)
- WhatsApp Business API integration (credentials ready)
- Facebook Lead Ads webhook (credentials ready)
- Property Inventory module
- Site Visit management
- Exotel telephony (when credentials available)
