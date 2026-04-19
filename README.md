# CodeAudit — Developer Career Intelligence Platform

> **Brutally honest. Ruthlessly accurate.**  
> Audit your GitHub repos, get your composite score, and a 90-day career roadmap.

---

## Project Structure

```
dev-career/
├── backend/              ← Frontend UI (TanStack Start / React / Tailwind)
│   └── src/
│       ├── routes/       ← File-based routing
│       ├── components/   ← UI components (landing, dashboard, animations)
│       ├── lib/
│       │   ├── api.ts    ← Typed API client → Express backend
│       │   └── mockData.ts
│       └── hooks/
│           └── use-auth.ts
│
└── backend/backend/      ← Express REST API
    └── src/
        ├── modules/
        │   ├── auth/     ← JWT + GitHub OAuth
        │   ├── github/   ← GitHub repository ingestion
        │   ├── analysis/ ← Full analysis trigger
        │   ├── scoring/  ← Score retrieval
        │   ├── reports/  ← Report + roadmap generation
        │   └── jobs/     ← Analysis job status
        ├── queue/        ← Direct execution (no Redis required)
        ├── shared/       ← Middleware + utilities
        └── config/       ← Database (Prisma + SQLite)
```

---

## Quick Start

### 1. Install dependencies

```bash
# API (Express backend)
cd backend/backend
npm install

# Frontend (TanStack Start)
cd backend
npm install
```

### 2. Configure the API

```bash
cd backend/backend
cp .env.example .env
# Edit .env with your GitHub OAuth credentials and JWT secrets
```

### 3. Set up the database

```bash
cd backend/backend
npx prisma generate
npx prisma db push
```

### 4. Run both servers

**Terminal 1 — API (port 4000):**
```bash
cd backend/backend
npm run dev
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd backend
npm run dev
```

Visit → **http://localhost:3000**  
API health check → **http://localhost:4000/health**

---

## GitHub OAuth Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Create a new **OAuth App**
3. Set **Authorization callback URL** to `http://localhost:4000/api/auth/github/callback`
4. Copy the **Client ID** and **Client Secret** into `backend/backend/.env`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Email/password registration |
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/github` | Start GitHub OAuth flow |
| GET | `/api/auth/me` | Get authenticated user profile |
| POST | `/api/github/sync` | Sync GitHub repositories |
| GET | `/api/github/repositories` | List user repositories |
| POST | `/api/analysis/start` | Trigger full code analysis |
| GET | `/api/analysis/results` | Get analysis results + score |
| GET | `/api/scoring` | Get latest composite score |
| GET | `/api/reports/latest` | Get report + roadmap |
| GET | `/api/jobs` | Get analysis job history |
| GET | `/health` | Health check |

---

## Tech Stack

**Frontend**
- React 19 + TanStack Router (file-based routing)
- TanStack Start (meta-framework)  
- Tailwind CSS v4 + Radix UI
- Framer Motion + GSAP
- Recharts

**Backend**
- Express.js + TypeScript
- Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- JWT authentication
- GitHub OAuth via passport-github2
- Zod input validation

---

## Deployment

See `DEPLOY.md` for Cloudflare Workers (frontend) + Railway/Render (API) deployment guide.
