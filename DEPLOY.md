# DEPLOY.md — Step-by-Step Production Deploy Guide

> **Architecture:** Express API on Render · Neon Postgres · React SPA on Vercel

---

## Prerequisites

- GitHub account with 2 repos (or one monorepo with subdirectory config)
- [Neon](https://neon.tech) account (free)
- [Render](https://render.com) account (free)
- [Vercel](https://vercel.com) account (free)

---

## Step 1 — Neon Database Setup

1. Go to **[neon.tech](https://neon.tech)** → create account → **New Project**
2. Choose a region close to your Render region (e.g. US East)
3. Copy the **Pooled connection string** (not direct) — it looks like:
   ```
   postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
4. Save this string — it becomes `DATABASE_URL` everywhere below

---

## Step 2 — GitHub OAuth App

1. Go to **[github.com/settings/developers](https://github.com/settings/developers)**
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** Dev Career
   - **Homepage URL:** `https://your-render-service.onrender.com` *(use a placeholder for now)*
   - **Authorization callback URL:** `https://your-render-service.onrender.com/api/auth/github/callback`
4. Click **Register application**
5. Generate a **Client Secret**
6. Save your **Client ID** and **Client Secret**

> ⚠️ Update the callback URL to the real Render URL after Step 3 completes.

---

## Step 3 — Deploy Backend to Render

### 3a. Push backend code to GitHub

The real backend lives at `backend/backend/`. Push it to its own GitHub repo or push the whole workspace.

```bash
# Option A: push whole workspace as one repo
git add .
git commit -m "feat: production-ready backend + frontend"
git push
```

### 3b. Create a Render Web Service

1. Go to **[render.com](https://render.com)** → New → **Web Service**
2. Connect your GitHub repo
3. Configure:
   | Field | Value |
   |---|---|
   | **Name** | `dev-career-api` (or any) |
   | **Root Directory** | `backend/backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

4. Under **Environment Variables**, add ALL of these:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` *(Render assigns this automatically — leave it, Render overrides)* |
   | `DATABASE_URL` | `postgresql://...` from Neon (pooled URL) |
   | `JWT_SECRET` | 64-char random string (run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
   | `JWT_REFRESH_SECRET` | Different 64-char random string |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `GITHUB_CLIENT_ID` | From Step 2 |
   | `GITHUB_CLIENT_SECRET` | From Step 2 |
   | `GITHUB_CALLBACK_URL` | `https://your-render-url.onrender.com/api/auth/github/callback` |
   | `GITHUB_TOKEN` | Your Personal Access Token (for GitHub API calls without OAuth) |
   | `FRONTEND_URL` | `https://your-vercel-url.vercel.app` *(add after Step 4; use placeholder for now)* |

5. Click **Create Web Service** → wait for deploy (~3 min first time)

6. Note your Render URL: `https://dev-career-api-xxxx.onrender.com`

### 3c. Run database migrations

After the backend deploys:
1. In Render dashboard → your service → **Shell** tab
2. Run:
   ```bash
   npx prisma migrate deploy
   ```
   This applies all pending migrations to Neon Postgres.

> **Alternative:** Add a Render pre-deploy command: `npx prisma migrate deploy`

### 3d. Test the health endpoint

```bash
curl https://your-render-url.onrender.com/health
# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

---

## Step 4 — Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com)** → New Project
2. Import your GitHub repo
3. Configure:
   | Field | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | Vite |
   | **Build Command** | `bun run build` *(or `npm run build`)* |
   | **Output Directory** | `dist` |

4. Under **Environment Variables**, add:
   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-render-url.onrender.com` *(from Step 3)* |

5. Click **Deploy** → wait ~1 min

6. Note your Vercel URL: `https://dev-career.vercel.app`

---

## Step 5 — Cross-wire: Connect Frontend ↔ Backend

### 5a. Update Render CORS

1. In Render → your backend service → **Environment**
2. Update `FRONTEND_URL` to: `https://your-vercel-url.vercel.app`
3. Click **Save Changes** → Render will redeploy automatically

### 5b. Update GitHub OAuth callback URL

1. Go back to your GitHub OAuth App settings
2. Update **Authorization callback URL** to:
   ```
   https://your-render-url.onrender.com/api/auth/github/callback
3. Update **Homepage URL** to: `https://your-vercel-url.vercel.app`
4. Save

### 5c. Smoke test

- Open your Vercel URL
- Go to `/input` → click "initiate audit"
- You should be redirected to GitHub for OAuth
- After authorising, you land at `/auth/callback` → then `/input` (now GitHub connected)
- Hit "initiate audit" again → analysis starts → redirects to `/auditing` → `/dashboard`

---

## Troubleshooting

### 🔴 `PrismaClientInitializationError: Can't reach database`
**Cause:** `DATABASE_URL` is wrong or missing  
**Fix:** Verify the Neon pooled URL is set in Render env vars. Must include `?sslmode=require`

### 🔴 `Prisma Client did not initialize`
**Cause:** `prisma generate` didn't run during build  
**Fix:** The `postinstall` script in `package.json` handles this — make sure Render's build command is `npm install && npm run build` (not just `npm run build`)

### 🔴 CORS blocked in browser
**Cause:** `FRONTEND_URL` in Render doesn't exactly match your Vercel origin  
**Fix:**
- No trailing slash: `https://myapp.vercel.app` ✅ vs `https://myapp.vercel.app/` ❌
- Check the exact origin in the browser console error message
- After fixing, redeploy the backend

### 🔴 Vercel 404 on page refresh (e.g. `/dashboard`)
**Cause:** Vercel serving 404 for non-root routes  
**Fix:** `frontend/vercel.json` already has the SPA rewrite rule. Verify it exists and was committed.

### 🟡 `process.env.PORT` not respected (Render)
**Cause:** Hardcoded port in server code  
**Fix:** Backend `src/index.ts` already reads `process.env.PORT || 4000`. Render injects `PORT` into the environment automatically.

### 🟡 First request to Render is slow (30s+)
**Cause:** Free tier services spin down after 15 minutes of inactivity  
**Fix:** Expected behaviour on free tier. Upgrade to paid for instant cold start. Or use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 10 minutes.

### 🔴 `Mixed content` — frontend HTTPS calling HTTP backend
**Cause:** Render URL must also be HTTPS (it is by default)  
**Fix:** Always use `https://your-render-url.onrender.com` in `VITE_API_URL`. Never `http://`

### 🔴 GitHub sync returns 400 `No GitHub account linked`
**Cause:** User hasn't completed GitHub OAuth — `githubUsername` is null  
**Fix:** User must go through the GitHub OAuth flow first (`/api/auth/github`). The frontend handles this on the `/input` page.

### 🔴 Neon: too many connections
**Cause:** Using the direct (non-pooled) connection string  
**Fix:** Use the **Pooled** connection string from Neon dashboard (the one with `-pooler` in the hostname). Neon's pooler handles connection limits automatically.

---

## Local Development (after all the above)

```bash
# Terminal 1: Start backend
cd backend/backend
cp .env.example .env      # fill in your values
npm install
npm run dev               # http://localhost:4000

# Terminal 2: Start frontend
cd frontend
cp .env.example .env.local # VITE_API_URL= (leave empty, proxy handles it)
npm install
npm run dev               # http://localhost:5173

# The Vite dev proxy routes /api/* → localhost:4000 automatically
# No CORS issues in dev
```

---

## Final Checklist

- [ ] `bun run build` succeeds in `frontend/` with exit 0  
- [ ] `bun run build` succeeds in `backend/backend/` with exit 0  
- [ ] `/health` returns `{"status":"healthy"}` on Render  
- [ ] GitHub OAuth flow completes end-to-end  
- [ ] `/dashboard` loads real data (not mock)  
- [ ] Refreshing `/dashboard/jobs` doesn't 404 on Vercel  
- [ ] `.env` and `.env.local` are NOT committed to git  
- [ ] `.env.example` IS committed to git  
