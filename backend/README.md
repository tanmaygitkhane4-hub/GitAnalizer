# Dev Career — AI-Powered Developer Intelligence Platform

> Analyze your GitHub. Score your skills. Get a career roadmap.

---

## 🧱 Architecture

```
User → Next.js Frontend → Express API → BullMQ Queue → Workers → PostgreSQL → Score/Report
```

---

## 📦 Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | Next.js 14 (App Router) + Tailwind + Framer Motion |
| Backend      | Node.js + Express + TypeScript    |
| Database     | PostgreSQL + Prisma ORM           |
| Queue        | BullMQ + Redis                    |
| Auth         | JWT + GitHub OAuth (Passport.js)  |
| Analysis     | GitHub API + custom scoring engine|

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (local or Docker)
- Redis (local or Docker)
- GitHub OAuth App

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

```bash
# Backend
cp .env.example .env
# Fill in: DATABASE_URL, JWT secrets, GitHub OAuth credentials, Redis config

# Frontend
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_API_URL
```

### 3. GitHub OAuth App Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:4000/api/auth/github/callback`
4. Copy Client ID + Secret to `backend/.env`

### 4. Database Setup

```bash
cd backend
npx prisma db push        # Create tables
npx prisma generate       # Generate client
npx prisma studio         # Optional: visual DB browser
```

### 5. Run with Docker (Recommended)

```bash
# From root
docker-compose up
```

### 6. Run Manually

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Redis (if not running)
redis-server
```

---

## 🏗️ Project Structure

```
dev-career/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── auth/           # JWT + GitHub OAuth
│       │   ├── github/         # GitHub API ingestion
│       │   ├── analysis/       # Analysis trigger routes
│       │   ├── scoring/        # 5-axis scoring engine
│       │   ├── jobs/           # BullMQ job status
│       │   └── reports/        # Report + roadmap generation
│       ├── queue/              # BullMQ setup + workers
│       ├── shared/
│       │   ├── middleware/     # Auth, error handlers
│       │   └── utils/          # AppError, helpers
│       ├── config/             # Database connection
│       └── prisma/             # Prisma schema
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx        # Landing page
        │   ├── login/          # Auth page (email + GitHub)
        │   ├── auth/callback/  # OAuth callback handler
        │   ├── dashboard/      # Score + repo overview
        │   ├── report/         # Career report + roadmap
        │   └── progress/       # Real-time job tracking
        └── lib/
            ├── api.ts          # Axios client + interceptors
            ├── store.ts        # Zustand auth store
            └── utils.ts        # Helpers
```

---

## 📊 Scoring System (5-Axis Weighted)

| Dimension     | Weight | Signal Sources |
|---------------|--------|----------------|
| Code Quality  | 30%    | AST analysis, test coverage, comment ratio |
| Project Depth | 25%    | Stars, language diversity, repo size, recency |
| Consistency   | 15%    | Commit frequency, message quality, streaks |
| UI/UX & Docs  | 10%    | README quality, topics, frontend frameworks |
| Security      | 20%    | Test patterns, original code ratio, practices |

**Levels:** Junior (< 50) → Mid (50–69) → Senior (70–84) → Staff (85+)

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register     — Email registration
POST /api/auth/login        — Email login
POST /api/auth/refresh      — Refresh JWT
GET  /api/auth/github       — GitHub OAuth start
GET  /api/auth/github/callback — OAuth callback
GET  /api/auth/me           — Current user profile
```

### GitHub
```
POST /api/github/sync             — Trigger ingestion job
GET  /api/github/repositories     — List user repos
GET  /api/github/repositories/:id — Repo details + commits
```

### Analysis
```
POST /api/analysis/start    — Start full analysis
GET  /api/analysis/results  — Score + repos + recent jobs
```

### Jobs
```
GET /api/jobs        — All jobs for current user
GET /api/jobs/:id    — Single job with progress
```

### Reports
```
GET /api/reports/latest  — Full report: score + gaps + roadmap
```

### Scoring
```
GET /api/scoring    — Latest score for current user
```

---

## 🐳 Docker Compose

```yaml
# docker-compose.yml (create in root)
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dev_career
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    depends_on: [postgres, redis]
    env_file: ./backend/.env

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
```

---

## 🗺️ Roadmap (Next Steps)

- [ ] Puppeteer live-app audit (performance, accessibility)
- [ ] PDF report generation
- [ ] Job matching engine (parse JDs, compare skills)
- [ ] Resume PDF parser (detect fake claims)
- [ ] AI-powered gap explanations (Claude/GPT integration)
- [ ] Team/org analysis mode
- [ ] Public profile pages

---

## 📄 License

MIT
