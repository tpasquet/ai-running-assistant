# Design : GitHub Actions CI

**Date** : 2026-04-04
**Statut** : Approuvé
**Contexte** : Monorepo avec backend Node.js (racine) + frontend React (`apps/web/`). Aucun workflow CI existant.

---

## Objectif

Mettre en place un CI qui s'exécute sur chaque push et chaque PR, couvrant lint, typecheck, tests avec seuil de coverage à 70%, et build du frontend.

---

## Approche retenue : Deux workflows séparés avec paths filters

Un fichier par package (`ci-backend.yml` + `ci-frontend.yml`). Chaque workflow ne se déclenche que si ses fichiers pertinents changent. Adapté à un monorepo appelé à grandir.

---

## Structure

```
.github/
└── workflows/
    ├── ci-backend.yml
    └── ci-frontend.yml
```

---

## Triggers (communs aux deux workflows)

```yaml
on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]
```

Chaque workflow ajoute un filtre `paths:` pour ne tourner que sur les changements pertinents.

---

## ci-backend.yml

### Paths filter
```yaml
paths:
  - "src/**"
  - "prisma/**"
  - "package.json"
  - "package-lock.json"
  - "tsconfig*.json"
  - "vitest.config.ts"
  - ".github/workflows/ci-backend.yml"
```

### Jobs (séquentiels)

| Job | Commandes | Dépend de |
|-----|-----------|-----------|
| `install` | `npm ci --legacy-peer-deps` | — |
| `lint` | `npm run lint` | `install` |
| `typecheck` | `npm run typecheck` | `install` |
| `test` | `npm run test:coverage` | `lint`, `typecheck` |

**Notes :**
- `--legacy-peer-deps` requis (LangGraph peer dep conflicts)
- Tests ne nécessitent pas Docker/DB — tout est mocké (iteration 1)
- `NODE_ENV=test` injecté dans le job `test`
- Coverage uploadé en artifact (`vitest-coverage-backend`)

### Coverage config (vitest.config.ts)
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "lcov"],
  thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
}
```

---

## ci-frontend.yml

### Paths filter
```yaml
paths:
  - "apps/web/**"
  - ".github/workflows/ci-frontend.yml"
```

### Jobs (séquentiels)

| Job | Commandes | Dépend de |
|-----|-----------|-----------|
| `install` | `npm ci` (dans `apps/web/`) | — |
| `typecheck` | `npm run typecheck` | `install` |
| `test` | `npm run test:coverage` | `typecheck` |
| `build` | `npm run build` | `test` |

**Notes :**
- Pas de `--legacy-peer-deps` (pas de LangGraph côté frontend)
- Aucune variable d'environnement nécessaire
- Coverage uploadé en artifact (`vitest-coverage-frontend`)
- Job `build` vérifie que le bundle ne casse pas à la compilation

### Coverage config (apps/web/vitest.config.ts)
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "lcov"],
  thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
}
```

---

## Cache npm

Les deux workflows utilisent `actions/cache` sur `~/.npm` :

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

---

## Environnement

- **Node.js** : `22.x`
- **OS** : `ubuntu-latest`
- **Runner** : GitHub-hosted (gratuit pour repos publics)

---

## Scripts à ajouter

### Backend (`package.json`)
```json
"test:coverage": "vitest run --coverage"
```

### Frontend (`apps/web/package.json`)
```json
"test:coverage": "vitest run --coverage"
```

### Dépendance à installer
- Backend : `@vitest/coverage-v8` (devDependency)
- Frontend : `@vitest/coverage-v8` (devDependency dans `apps/web/`)

---

## Definition of Done

- [ ] `.github/workflows/ci-backend.yml` créé et fonctionnel
- [ ] `.github/workflows/ci-frontend.yml` créé et fonctionnel
- [ ] `@vitest/coverage-v8` installé dans backend et frontend
- [ ] `test:coverage` script ajouté dans les deux `package.json`
- [ ] Coverage thresholds configurés (70%) dans les deux `vitest.config.ts`
- [ ] CI passe sur `main` (badge vert)
- [ ] CI échoue si coverage < 70% (testé manuellement ou via PR)
- [ ] Artifacts de coverage uploadés sur chaque run
