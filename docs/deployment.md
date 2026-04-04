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
