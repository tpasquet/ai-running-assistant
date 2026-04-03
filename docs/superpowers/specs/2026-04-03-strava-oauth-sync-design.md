# Design : Strava OAuth + Sync (Iteration 2 — Sous-système 1)

**Date** : 2026-04-03
**Statut** : Approuvé
**Contexte** : Iteration 1 (AI Core) complète. Ce document couvre le premier sous-système de l'iteration 2 : authentification Strava et synchronisation des activités.

---

## Objectif

Permettre à un utilisateur de s'authentifier via Strava (OAuth 2.0), déclencher un sync initial de ses 90 derniers jours d'activités en arrière-plan, et recevoir les nouvelles activités en temps réel via webhook — le tout sans bloquer l'interface.

---

## Approche retenue : Queue-first simplifiée

Une seule queue BullMQ, un seul worker, deux types de jobs (`initial-sync`, `sync-activity`). Architecture cohérente, retry intégré, rate limiting naturel via concurrence worker = 1.

---

## Architecture & Flux

```
GET /auth/strava/login
  → redirect Strava OAuth (scope: activity:read_all)

GET /auth/strava/callback?code=...
  → POST strava/token → access_token + refresh_token
  → AES-256-GCM encrypt tokens
  → INSERT user + strava_tokens (upsert)
  → stravaQueue.add("initial-sync", { userId })
  → return { jwt }          ← immédiat, pas d'attente

BullMQ Worker (strava-sync.worker.ts)
  job: "initial-sync"
    → pages Strava /athlete/activities (90j, 100/page)
    → sleep(500ms) entre chaque page        ← rate limit
    → retry(3, backoff exponentiel) si 429
    → activityService.upsert() par activité
    → aggregationService.recalculateAll(userId)
    → invalidate Redis cache ctx:{userId}

  job: "sync-activity"   ← déclenché par webhook
    → stravaClient.getActivity(stravaActivityId)
    → activityService.upsert()
    → aggregationService.recalculate(userId, date)
    → invalidate Redis cache ctx:{userId}

POST /strava/webhook
  → vérif hub.verify_token (subscription)
  → stravaQueue.add("sync-activity", req.body)
  → 200 immédiat

Cron (toutes les 30min)
  → refresh tokens expirant dans < 1h
```

---

## Fichiers à créer

```
src/infra/strava/StravaOAuth.ts              # authorize + callback + token refresh
src/infra/strava/StravaClient.ts             # getActivity, getActivities (fetch wrapper)
src/infra/strava/StravaSync.ts               # syncInitial, syncActivity
src/infra/queue/queues.ts                    # BullMQ queue definition
src/infra/queue/workers/strava-sync.worker.ts
src/api/routes/auth.routes.ts                # /auth/strava/*
src/api/routes/webhook.routes.ts             # /strava/webhook
src/api/plugins/auth.plugin.ts               # JWT verify middleware
```

---

## Data Model (Prisma)

```prisma
model User {
  id          String       @id @default(cuid())
  stravaId    Int          @unique
  username    String
  createdAt   DateTime     @default(now())
  stravaToken StravaToken?
  activities  Activity[]
}

model StravaToken {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  accessTokenEnc  String   // AES-256-GCM encrypted
  refreshTokenEnc String   // AES-256-GCM encrypted
  expiresAt       DateTime // refresh proactif si < now() + 1h
  scope           String
  updatedAt       DateTime @updatedAt
}

model Activity {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  stravaId       Int      @unique  // empêche les doublons à l'upsert
  type           String   // Run | TrailRun | VirtualRun
  startDate      DateTime
  movingTimeSec  Int
  distanceMeters Float
  avgSpeedMS     Float
  totalElevM     Float
  avgHrBpm       Int?
  tss            Float?   // calculé après import
  createdAt      DateTime @default(now())
}
```

---

## Sécurité

### Chiffrement des tokens Strava (`src/shared/utils/crypto.ts`)
- Algorithme : AES-256-GCM
- Clé : `ENCRYPTION_KEY` (32 bytes hex, variable d'environnement)
- Format stocké : `iv:authTag:ciphertext` (IV aléatoire par opération)
- Déchiffrement uniquement dans `StravaOAuth.ts` — jamais exposé hors de `infra/`

### JWT applicatif
- Payload : `{ sub: userId, iat, exp }`
- Expiry : 7 jours
- Secret : `JWT_SECRET`
- Vérifié par `auth.plugin.ts` sur toutes les routes protégées

---

## Rate Limiting Strava

```typescript
// Entre chaque page du sync initial
await sleep(500); // ~2 pages/sec, bien sous la limite 100 req/15min

// Sur réponse 429
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get("X-RateLimit-Reset") ?? "60");
  await sleep(retryAfter * 1000);
  // BullMQ retry prend le relais (max 3 tentatives, backoff exponentiel)
}
```

---

## Gestion des erreurs

```typescript
class StravaAuthError extends AppError      // OAuth échoue (code invalide)
class StravaRateLimitError extends AppError // 429 non résolu après retries
class ActivitySyncError extends AppError    // échec sync d'une activité
```

Jobs BullMQ en échec après 3 retries → status `failed` dans Redis (consultable, non perdu).

---

## Plan de tests

| Fichier | Ce qu'on teste |
|---------|---------------|
| `StravaOAuth.test.ts` | callback avec code valide/invalide, refresh token expiré |
| `StravaSync.test.ts` | sync initial avec mock Strava API, gestion 429, pagination |
| `strava-sync.worker.test.ts` | jobs `initial-sync` et `sync-activity` avec mocks |
| `auth.routes.test.ts` | flow OAuth complet (mock Strava), JWT retourné |
| `webhook.routes.test.ts` | vérif token, enqueue job, 200 immédiat |

Tous les tests mockent `StravaClient` — aucun appel réel à l'API Strava.

---

## Definition of Done

- [ ] `GET /auth/strava/login` redirige vers Strava
- [ ] `GET /auth/strava/callback` retourne un JWT immédiatement
- [ ] Tokens Strava chiffrés en base (vérifiable via SELECT)
- [ ] Job `initial-sync` enqueued après OAuth, worker traite les 90j
- [ ] sleep(500ms) entre pages, backoff sur 429
- [ ] `POST /strava/webhook` retourne 200 < 100ms, job enqueued
- [ ] Token refresh automatique (cron 30min)
- [ ] Tous les tests passent (`npm test`)
- [ ] `npm run typecheck` sans erreur
