# Preview Deployments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable branch-based preview deployments — Vercel for the frontend SPA, Railway for the backend API.

**Architecture:** Three config files + one GitHub Actions CD workflow + one documentation file. Vercel auto-deploys frontend on push via GitHub App (no Actions needed). Railway deploys backend via `cd-backend.yml` triggered on push to `main` or `staging`. The `staging` branch is a long-lived integration branch for backend testing.

**Tech Stack:** Vercel (static hosting + preview URLs), Railway (Node.js hosting + PostgreSQL + Redis), GitHub Actions (CD trigger via Railway CLI action).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/vercel.json` | Create | Pins Vercel build config in repo |
| `railway.toml` | Create | Railway build + deploy config |
| `.github/workflows/cd-backend.yml` | Create | CD: deploy to Railway on push to main/staging |
| `docs/deployment.md` | Create | Manual setup steps (Vercel dashboard + Railway dashboard) |

> **Note:** `.github/workflows/ci-backend.yml` and `ci-frontend.yml` live on `feature/github-actions-ci`. This branch adds only the CD workflow. They will coexist after both branches are merged to main.

---

## Task 1: Vercel config for frontend

**Files:**
- Create: `apps/web/vercel.json`

- [ ] **Step 1: Create apps/web/vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> The `rewrites` rule is required for SPA routing — if you add client-side routes later (React Router), Vercel will serve `index.html` instead of returning 404 on direct URL access.

- [ ] **Step 2: Verify the JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/web/vercel.json', 'utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add apps/web/vercel.json
git commit -m "feat(deploy): add Vercel config for frontend preview deployments"
```

---

## Task 2: Railway config for backend

**Files:**
- Create: `railway.toml`

- [ ] **Step 1: Create railway.toml at repo root**

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npx prisma migrate deploy && node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

> `npx prisma migrate deploy` runs pending migrations on startup (safe in production — only applies new migrations, never recreates). `node dist/index.js` assumes `npm run build` (tsc) already ran during the Railway build phase.

- [ ] **Step 2: Verify TOML syntax**

```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('railway.toml', 'utf8');
console.log('File exists, length:', content.length, 'chars');
console.log(content);
"
```

Expected: file content printed with no errors.

- [ ] **Step 3: Commit**

```bash
git add railway.toml
git commit -m "feat(deploy): add Railway config for backend deployment"
```

---

## Task 3: CD workflow for Railway

**Files:**
- Create: `.github/workflows/cd-backend.yml`

- [ ] **Step 1: Create .github/workflows/cd-backend.yml**

```yaml
name: CD — Backend (Railway)

on:
  push:
    branches:
      - main
      - staging
    paths:
      - "src/**"
      - "prisma/**"
      - "package.json"
      - "package-lock.json"
      - "railway.toml"
      - ".github/workflows/cd-backend.yml"

jobs:
  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    environment: ${{ github.ref_name == 'main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        run: railway up --service api --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

> **Two environments:** push to `main` deploys to Railway `production` environment, push to `staging` deploys to Railway `staging` environment. The `environment:` key in GitHub Actions creates a protection gate — you can add required reviewers in GitHub Settings → Environments → production.
>
> `--detach` means the action doesn't wait for the Railway deploy to finish (fire and forget). Remove it if you want the GitHub Actions job to reflect Railway deploy success/failure.

- [ ] **Step 2: Verify YAML syntax**

```bash
node -e "
const fs = require('fs');
const yaml = fs.readFileSync('.github/workflows/cd-backend.yml', 'utf8');
console.log('Lines:', yaml.split('\n').length);
// Check no tab characters (YAML requires spaces)
if (yaml.includes('\t')) { console.error('ERROR: tabs found!'); process.exit(1); }
console.log('No tabs found - YAML indentation OK');
"
```

Expected: line count printed, `No tabs found - YAML indentation OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/cd-backend.yml
git commit -m "feat(deploy): add Railway CD workflow triggered on main/staging push"
```

---

## Task 4: Create staging branch

- [ ] **Step 1: Create and push the staging branch**

```bash
git checkout -b staging
git push -u origin staging
git checkout feature/preview-deployments
```

Expected: `staging` branch now exists on GitHub. The Railway `staging` environment will track this branch.

- [ ] **Step 2: Verify branch exists on remote**

```bash
git ls-remote --heads origin staging
```

Expected: one line showing `refs/heads/staging`.

---

## Task 5: Deployment documentation

**Files:**
- Create: `docs/deployment.md`

- [ ] **Step 1: Create docs/deployment.md**

```markdown
# Deployment Guide

## Architecture

| Layer | Service | URL |
|-------|---------|-----|
| Frontend (production) | Vercel | runcoach-ai.vercel.app |
| Frontend (preview) | Vercel | Auto-generated per branch |
| Backend (production) | Railway | runcoach-api.up.railway.app |
| Backend (staging) | Railway | runcoach-api-staging.up.railway.app |
| Database | Railway PostgreSQL | injected via DATABASE_URL |
| Cache / Queue | Railway Redis | injected via REDIS_URL |

---

## Initial Setup (one-time, manual)

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `tpasquet/ai-running-assistant`
3. Set **Root Directory** = `apps/web`
4. Framework: Vite (auto-detected)
5. Click Deploy — preview URLs are now automatic per branch

No environment variables needed for the static vitrine.

When the user dashboard is built, add in Vercel:
- `VITE_API_URL` = Railway backend URL (production or staging)

### Backend — Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `tpasquet/ai-running-assistant`
3. Add plugins: **PostgreSQL** + **Redis** (Railway injects `DATABASE_URL` and `REDIS_URL` automatically)
4. Set environment variables in Railway dashboard:

```
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=<your key>
STRAVA_CLIENT_ID=<your id>
STRAVA_CLIENT_SECRET=<your secret>
STRAVA_WEBHOOK_VERIFY_TOKEN=<arbitrary token>
JWT_SECRET=<random 64-char hex>
ENCRYPTION_KEY=<random 32-byte hex>
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY
```

5. Create a **staging environment** in Railway:
   - Settings → Environments → New Environment → name it `staging`
   - Link to branch `staging`
   - Add same env vars (use separate Strava app for staging if needed)

### GitHub Secrets (for CD workflow)

1. In Railway: Account Settings → Tokens → New Token → name it `github-actions`
2. In GitHub repo: Settings → Secrets and variables → Actions → New secret:
   - Name: `RAILWAY_TOKEN`
   - Value: the token from step 1

### GitHub Environments (optional, recommended for production gate)

1. GitHub repo → Settings → Environments → New environment → `production`
2. Add required reviewer (yourself)
3. Now pushes to `main` require approval before Railway deploy runs

---

## Day-to-day workflow

### Test a feature branch visually (frontend)

Just push to your branch — Vercel creates a preview URL automatically within ~60s.

### Test a feature branch visually (backend)

```bash
git checkout staging
git merge feature/my-feature
git push origin staging
```

Railway staging environment deploys automatically.

### Deploy to production

```bash
git checkout main
git merge staging  # or merge PR
git push origin main
```

Railway production environment deploys automatically (with approval gate if configured).

---

## Troubleshooting

**Vercel build fails:**
- Check Node.js version in Vercel settings matches `22.x`
- Check `apps/web/vercel.json` `installCommand` is `npm ci`

**Railway deploy fails:**
- Check `RAILWAY_TOKEN` secret is set in GitHub
- Check Railway logs in dashboard → Deployments
- `npx prisma migrate deploy` fails = check `DATABASE_URL` is set

**Cold start on Railway free tier:**
- Expected — free tier sleeps after 15min inactivity
- Upgrade to Starter ($5/mo) for always-on
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add deployment guide for Vercel + Railway setup"
```

---

## Task 6: Push PR branch

- [ ] **Step 1: Push feature/preview-deployments**

```bash
git push -u origin feature/preview-deployments
```

- [ ] **Step 2: Verify all files are present**

```bash
git diff main --name-only
```

Expected output (in any order):
```
apps/web/vercel.json
railway.toml
.github/workflows/cd-backend.yml
docs/deployment.md
docs/superpowers/plans/2026-04-04-preview-deployments.md
```

> `docs/superpowers/specs/2026-04-04-preview-deployments-design.md` is on `main` already (committed during brainstorming).
