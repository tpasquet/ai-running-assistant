# GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CI quality gates (lint, typecheck, tests, coverage ≥70%) for backend and frontend via two separate GitHub Actions workflows.

**Architecture:** Two workflows in `.github/workflows/` with `paths` filters — `ci-backend.yml` covers the root Node.js package, `ci-frontend.yml` covers `apps/web/`. Backend coverage config goes on this branch; frontend coverage config (`apps/web/`) must be applied on `feature/web-vitrine` before that branch is merged.

**Tech Stack:** GitHub Actions, Node.js 22, `@vitest/coverage-v8`, Vitest 2.x.

---

## File Map

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Modify | Add `test:coverage` script, add `@vitest/coverage-v8` devDep |
| `vitest.config.ts` | Modify | Add `thresholds` to existing `coverage` block |
| `.github/workflows/ci-backend.yml` | Create | lint → typecheck → test with coverage |
| `.github/workflows/ci-frontend.yml` | Create | typecheck → test with coverage → build |
| `apps/web/package.json` ⚠️ | Modify on `feature/web-vitrine` | Add `test:coverage`, add `@vitest/coverage-v8` |
| `apps/web/vitest.config.ts` ⚠️ | Modify on `feature/web-vitrine` | Add `thresholds` |

> ⚠️ The two `apps/web/` files live on the `feature/web-vitrine` branch. Apply those changes there before merging that PR — see Task 4.

---

## Task 1: Backend coverage config

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install @vitest/coverage-v8**

```bash
npm install --save-dev @vitest/coverage-v8 --legacy-peer-deps
```

Expected: package added to `devDependencies` in `package.json`.

- [ ] **Step 2: Add test:coverage script to package.json**

In `package.json`, add `"test:coverage"` to the `scripts` section:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Add thresholds to vitest.config.ts**

The file currently has a `coverage` block with `provider: "v8"` but no thresholds. Add `thresholds` and update `reporter` to include `lcov`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/__tests__/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

- [ ] **Step 4: Verify coverage runs locally**

```bash
npm run test:coverage
```

Expected: tests pass, coverage report printed to terminal, no threshold failure (current tests cover well above 70%).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "feat(ci): add coverage config and test:coverage script to backend"
```

---

## Task 2: ci-backend.yml

**Files:**
- Create: `.github/workflows/ci-backend.yml`

- [ ] **Step 1: Create .github/workflows/ci-backend.yml**

```yaml
name: CI — Backend

on:
  push:
    branches: ["**"]
    paths:
      - "src/**"
      - "prisma/**"
      - "package.json"
      - "package-lock.json"
      - "tsconfig*.json"
      - "vitest.config.ts"
      - ".github/workflows/ci-backend.yml"
  pull_request:
    branches: ["**"]
    paths:
      - "src/**"
      - "prisma/**"
      - "package.json"
      - "package-lock.json"
      - "tsconfig*.json"
      - "vitest.config.ts"
      - ".github/workflows/ci-backend.yml"

jobs:
  install:
    name: Install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-backend-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-backend-

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

  lint:
    name: Lint
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-backend-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-backend-

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Lint
        run: npm run lint

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-backend-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-backend-

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Typecheck
        run: npm run typecheck

  test:
    name: Test + Coverage
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    env:
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-backend-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-backend-

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Test with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-coverage-backend
          path: coverage/
          retention-days: 7
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci-backend.yml
git commit -m "feat(ci): add ci-backend workflow (lint, typecheck, test, coverage)"
```

---

## Task 3: ci-frontend.yml

**Files:**
- Create: `.github/workflows/ci-frontend.yml`

> Note: `apps/web/` does not exist on `main` yet (it's on `feature/web-vitrine`). This workflow file is created now — it will not trigger until `apps/web/**` files land on the branch being pushed.

- [ ] **Step 1: Create .github/workflows/ci-frontend.yml**

```yaml
name: CI — Frontend

on:
  push:
    branches: ["**"]
    paths:
      - "apps/web/**"
      - ".github/workflows/ci-frontend.yml"
  pull_request:
    branches: ["**"]
    paths:
      - "apps/web/**"
      - ".github/workflows/ci-frontend.yml"

jobs:
  install:
    name: Install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-frontend-${{ hashFiles('apps/web/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-frontend-

      - name: Install dependencies
        working-directory: apps/web
        run: npm ci

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-frontend-${{ hashFiles('apps/web/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-frontend-

      - name: Install dependencies
        working-directory: apps/web
        run: npm ci

      - name: Typecheck
        working-directory: apps/web
        run: npm run typecheck

  test:
    name: Test + Coverage
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-frontend-${{ hashFiles('apps/web/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-frontend-

      - name: Install dependencies
        working-directory: apps/web
        run: npm ci

      - name: Test with coverage
        working-directory: apps/web
        run: npm run test:coverage

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-coverage-frontend
          path: apps/web/coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-frontend-${{ hashFiles('apps/web/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-frontend-

      - name: Install dependencies
        working-directory: apps/web
        run: npm ci

      - name: Build
        working-directory: apps/web
        run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci-frontend.yml
git commit -m "feat(ci): add ci-frontend workflow (typecheck, test, coverage, build)"
```

---

## Task 4: Frontend coverage config (on feature/web-vitrine)

> ⚠️ This task must be done on the `feature/web-vitrine` branch, NOT on `feature/github-actions-ci`. The files `apps/web/package.json` and `apps/web/vitest.config.ts` only exist there.

**Files (on feature/web-vitrine):**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vitest.config.ts`

- [ ] **Step 1: Switch to the web-vitrine worktree**

```bash
cd .worktrees/feature/web-vitrine
```

- [ ] **Step 2: Install @vitest/coverage-v8 in apps/web**

```bash
cd apps/web && npm install --save-dev @vitest/coverage-v8
```

Expected: package added to `devDependencies` in `apps/web/package.json`.

- [ ] **Step 3: Add test:coverage script to apps/web/package.json**

In `apps/web/package.json`, add `"test:coverage"` to the scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Add thresholds to apps/web/vitest.config.ts**

Current file has `test.environment: "jsdom"` and `test.globals: true` but no coverage config. Add a `coverage` block:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/components/ui/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

> Note: `src/components/ui/**` is excluded because shadcn/ui primitives are third-party code, not business logic worth measuring.

- [ ] **Step 5: Verify coverage runs locally**

```bash
npm run test:coverage
```

Expected: 18 tests pass, coverage printed, thresholds met (current tests are above 70%).

- [ ] **Step 6: Commit on feature/web-vitrine**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/vitest.config.ts
git commit -m "feat(ci): add coverage config and test:coverage script to frontend"
```

- [ ] **Step 7: Push**

```bash
git push origin feature/web-vitrine
```

---

## Task 5: Push and verify

- [ ] **Step 1: Push feature/github-actions-ci**

From the `feature/github-actions-ci` worktree:

```bash
git push -u origin feature/github-actions-ci
```

- [ ] **Step 2: Verify CI triggers on GitHub**

Go to `https://github.com/tpasquet/ai-running-assistant/actions` and confirm:
- `CI — Backend` workflow triggered on the push
- Jobs: Install → Lint + Typecheck (parallel) → Test + Coverage
- All jobs green ✅

- [ ] **Step 3: Verify coverage artifact**

In the completed workflow run, check the `vitest-coverage-backend` artifact is uploaded and downloadable.
