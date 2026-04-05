# Authentication & Identity

## Principes

**Auth ≠ Intégration Strava**
- L'authentification (qui es-tu ?) est gérée par `apps/auth` via des providers d'identité
- L'intégration Strava (tes données d'entraînement) est une connexion séparée, faite pendant l'onboarding
- Un utilisateur peut se connecter avec Google et avoir ou non Strava lié

**Session unifiée**
- Quel que soit le provider d'identité, la session produit un JWT applicatif identique
- Le reste de l'API (activités, IA, feedback) ne connaît que ce JWT

---

## Providers supportés

| Provider | Type | Priorité |
|----------|------|----------|
| Email / mot de passe | Credentials | MVP |
| Google | OAuth 2.0 | MVP |
| Apple | OAuth 2.0 | Mobile (post-MVP) |
| GitHub | OAuth 2.0 | Optionnel |

---

## Flows

### Email / mot de passe

```
POST /auth/register { email, password, name }
        │
        ▼
  Zod validation + password bcrypt (cost 12)
        │
        ▼
  INSERT users + accounts (provider: "email")
        │
        ▼
  Send verification email (optional — post-MVP)
        │
        ▼
  JWT applicatif { userId, email }

POST /auth/login { email, password }
        │
        ▼
  Lookup user → bcrypt.compare
        │
        ▼
  JWT applicatif (7 jours)
```

### Google OAuth

```
GET /auth/google/login
        │
        ▼
  Redirect → accounts.google.com/o/oauth2/auth
    ?client_id=...&scope=openid email profile
        │
        ▼ (callback)
GET /auth/google/callback?code=...
        │
        ▼
  Exchange code → id_token + access_token
        │
        ▼
  Verify id_token (Google public keys)
        │
        ▼
  Upsert user par email
  Upsert account (provider: "google", providerAccountId: sub)
        │
        ▼
  JWT applicatif (7 jours)
        │
        ▼
  Redirect → apps/dashboard
```

### Apple Sign In (mobile)

```
POST /auth/apple/callback { id_token, user? }
        │
        ▼
  Verify JWT Apple (apple public keys JWKS)
        │
        ▼
  Upsert user (email masqué ou réel)
  Upsert account (provider: "apple", providerAccountId: sub)
        │
        ▼
  JWT applicatif
```

---

## Modèle de données

### Table `users` (extension du schéma existant)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  stravaToken   StravaToken?
  activities    Activity[]
  weeklyAggs    WeeklyAggregate[]
  dailyFeedbacks DailyFeedback[]
  goals         Goal[]
}
```

### Table `accounts` (nouvelle)

```prisma
model Account {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Identity provider
  provider          String   // "email" | "google" | "apple" | "github"
  providerAccountId String   // sub Google, sub Apple, ou email pour credentials

  // Credentials (email/password uniquement)
  passwordHash      String?

  // OAuth tokens du provider d'identité (pas Strava)
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

> **Note** : `StravaToken` reste une table séparée — Strava n'est pas un provider d'identité mais une intégration de données.

---

## Architecture `apps/auth`

Application Vite + React indépendante, servie sur un sous-domaine (`auth.runcoach.app`).

```
apps/auth/
├── src/
│   ├── pages/
│   │   ├── Login.tsx          # Email/pwd + boutons Google / Apple
│   │   ├── Register.tsx       # Inscription email/pwd
│   │   ├── ForgotPassword.tsx
│   │   └── Callback.tsx       # Réception du code OAuth (Google/Apple)
│   ├── components/
│   │   ├── SocialButton.tsx   # Bouton générique "Continuer avec X"
│   │   └── AuthCard.tsx       # Card conteneur
│   └── lib/
│       └── auth.ts            # Appels vers l'API backend /auth/*
```

**Après authentification réussie :**
- JWT stocké en `httpOnly` cookie (ou `localStorage` en fallback)
- Redirect vers `apps/dashboard` ou l'onboarding Strava si premier login

---

## Routes backend `/auth/*`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/auth/register` | Inscription email/pwd |
| `POST` | `/auth/login` | Connexion email/pwd |
| `GET` | `/auth/google/login` | Redirect vers Google |
| `GET` | `/auth/google/callback` | Callback Google |
| `POST` | `/auth/apple/callback` | Callback Apple (mobile) |
| `POST` | `/auth/refresh` | Refresh JWT |
| `POST` | `/auth/logout` | Invalide la session |
| `GET` | `/auth/strava/login` | Connexion Strava (données) |
| `GET` | `/auth/strava/callback` | Callback Strava (données) |

---

## Onboarding après inscription

```
Register / Premier login
        │
        ▼
  apps/dashboard → Onboarding step 1
  "Connecte ton compte Strava pour importer tes activités"
        │
        ├── [Connecter Strava] → GET /auth/strava/login
        │         │
        │         ▼
        │   Strava OAuth → sync 90 jours → Dashboard
        │
        └── [Passer] → Dashboard sans données
                  (peut connecter Strava plus tard dans Profil)
```

Strava n'est **jamais** requis pour créer un compte — il est optionnel et peut être connecté / déconnecté à tout moment.

---

## Sécurité

| Élément | Implémentation |
|---------|----------------|
| Passwords | bcrypt, cost factor 12 |
| JWT | HS256, 7 jours, `httpOnly` cookie |
| PKCE | Obligatoire pour Google et Apple (mitigation CSRF) |
| State parameter | UUID par session OAuth, vérifié au callback |
| Rate limiting | 5 tentatives/min sur `/auth/login` (brute-force) |
| Token Google/Apple | Vérification signature via JWKS publics |
| HTTPS | Obligatoire en production (Railway + Vercel forcent TLS) |

---

## Librairie recommandée

**`better-auth`** (framework-agnostic, supporte Fastify + Prisma nativement)

- Gère email/pwd, Google, Apple, GitHub out-of-the-box
- Génère les routes et adapters Prisma automatiquement
- Évite d'implémenter PKCE, JWKS, CSRF manuellement
- Compatible ESM + TypeScript strict

Alternative : implémenter manuellement (plus de contrôle, plus de code).
