# Design : Preview Deployments (Vercel + Railway)

**Date** : 2026-04-04
**Statut** : Approuvé
**Contexte** : CI en place (feature/github-actions-ci). Ce document couvre le CD : previews frontend par branche via Vercel, staging backend via Railway.

---

## Objectif

Permettre de tester visuellement n'importe quelle branche en déployant automatiquement :
- Le frontend `apps/web/` sur Vercel (preview URL par branche, automatique)
- Le backend Node.js sur Railway (environment staging, deploy sur push)

---

## Architecture

```
GitHub Push/PR
    │
    ├── apps/web/** → Vercel GitHub App
    │       └── Preview URL automatique par branche
    │           main    → runcoach-ai.vercel.app
    │           feature → feature-xxx.vercel.app
    │
    └── src/** → ci-backend.yml → Railway CLI
            └── staging environment
                runcoach-staging.up.railway.app
```

---

## Frontend : Vercel

### Configuration

Vercel détecte Vite automatiquement. Un fichier `apps/web/vercel.json` ancre la config dans le repo :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite"
}
```

### Root directory

Configuré dans le dashboard Vercel : **Root Directory = `apps/web`**. Vercel n'installera et ne buildera que ce sous-dossier.

### Preview URLs

Automatique sans config supplémentaire — Vercel crée une URL unique par branche dès qu'un push est détecté. Aucun token GitHub Actions nécessaire (Vercel écoute via sa propre GitHub App).

### Variables d'environnement

Aucune pour la vitrine statique actuelle. Quand l'espace utilisateur sera connecté à l'API, ajouter dans Vercel :
- `VITE_API_URL` → URL Railway staging (preview) ou prod (production)

---

## Backend : Railway

### Projet Railway

Un projet `runcoach-ai` avec 4 services :

| Service | Type | Branch |
|---------|------|--------|
| `api` | Web Service (Node.js) | `main` → production |
| `worker` | Background Worker | `main` → production |
| `postgres` | Plugin PostgreSQL | — |
| `redis` | Plugin Redis | — |

Un **environment `staging`** dans le même projet Railway, trackant la branche `staging` (branche dédiée créée à partir de main, vers laquelle on merge les features à tester).

### Build & Start

```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
```

### Worker

Service séparé dans Railway avec la même image mais une commande différente — Railway détecte automatiquement si on configure `startCommand` différemment par service.

### Variables d'environnement Railway

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Auto-injecté par le plugin PostgreSQL |
| `REDIS_URL` | Auto-injecté par le plugin Redis |
| `PORT` | Auto-injecté par Railway (3000) |
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | Manuel dans Railway dashboard |
| `STRAVA_CLIENT_ID` | Manuel |
| `STRAVA_CLIENT_SECRET` | Manuel |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Manuel |
| `JWT_SECRET` | Manuel |
| `ENCRYPTION_KEY` | Manuel |

### Migration DB

Ajoutée dans le `startCommand` Railway :
```
npx prisma migrate deploy && npm start
```

---

## GitHub Actions — Deploy job

Le `ci-backend.yml` existant est étendu avec un job `deploy` conditionnel :

```yaml
deploy:
  name: Deploy to Railway
  runs-on: ubuntu-latest
  needs: test
  if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
  steps:
    - uses: actions/checkout@v4
    - uses: railway/railway-action@v1
      with:
        service: api
        token: ${{ secrets.RAILWAY_TOKEN }}
```

Le `RAILWAY_TOKEN` est un secret GitHub configuré dans Settings → Secrets.

---

## Étapes manuelles requises (hors scope code)

1. Créer un compte Vercel, connecter le repo, configurer Root Directory = `apps/web/`
2. Créer un compte Railway, créer le projet `runcoach-ai`, ajouter plugins PostgreSQL + Redis
3. Créer l'environment `staging` dans Railway
4. Générer un `RAILWAY_TOKEN` et l'ajouter dans GitHub Secrets
5. Renseigner les variables d'environnement secrets dans Railway dashboard

---

## Definition of Done

- [ ] `apps/web/vercel.json` créé et commité
- [ ] `railway.toml` créé et commité
- [ ] `ci-backend.yml` étendu avec job `deploy` (conditionnel sur main/staging)
- [ ] Branche `staging` créée sur GitHub
- [ ] Documentation des étapes manuelles dans `docs/deployment.md`
- [ ] PR ouverte sur `feature/preview-deployments`
