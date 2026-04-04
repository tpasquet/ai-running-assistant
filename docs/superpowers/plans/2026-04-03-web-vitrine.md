# Web Vitrine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static marketing SPA for RunCoach AI in `apps/web/` — hero, features, how-it-works, social proof, CTA with email capture, and footer.

**Architecture:** Vite + React 19 + TypeScript SPA isolated in `apps/web/` with its own `package.json`. Tailwind CSS 4 (CSS-first config via `@theme {}`) + shadcn/ui components. Framer Motion for scroll animations. Tests with Vitest + @testing-library/react.

**Tech Stack:** Vite 6, React 19, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/vite`), shadcn/ui (new-york style), Framer Motion, Zod, Vitest, @testing-library/react, lucide-react.

---

## File Map

| File | Role |
|------|------|
| `apps/web/package.json` | Frontend deps and scripts (isolated from backend) |
| `apps/web/vite.config.ts` | Vite + Tailwind CSS 4 plugin + `@/` alias |
| `apps/web/tsconfig.json` | TS project references root |
| `apps/web/tsconfig.app.json` | TS config for src/ |
| `apps/web/tsconfig.node.json` | TS config for vite.config.ts |
| `apps/web/vitest.config.ts` | Frontend test config (jsdom) |
| `apps/web/index.html` | HTML entry point |
| `apps/web/src/index.css` | Tailwind imports + `@theme {}` design tokens |
| `apps/web/src/main.tsx` | React mount point |
| `apps/web/src/App.tsx` | Sections composition |
| `apps/web/src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `apps/web/components.json` | shadcn/ui config (Tailwind v4 compatible) |
| `apps/web/src/components/ui/` | shadcn/ui primitives (Button, Card, Badge, Input, Carousel) |
| `apps/web/src/components/shared/SectionWrapper.tsx` | Uniform padding + max-width wrapper |
| `apps/web/src/components/shared/Navbar.tsx` | Sticky nav with scroll transparency |
| `apps/web/src/components/sections/HeroSection.tsx` | Hero layout + Framer Motion animation |
| `apps/web/src/components/sections/FeaturesSection.tsx` | 6-feature grid with FeatureCard |
| `apps/web/src/components/sections/HowItWorksSection.tsx` | 3-step timeline |
| `apps/web/src/components/sections/SocialProofSection.tsx` | Testimonial carousel + stats bar |
| `apps/web/src/components/sections/CTASection.tsx` | Email capture with Zod validation |
| `apps/web/src/components/sections/Footer.tsx` | Links, brand, socials |
| `apps/web/src/__tests__/App.test.tsx` | All 6 sections present in DOM |
| `apps/web/src/components/sections/__tests__/HeroSection.test.tsx` | CTA link rendered |
| `apps/web/src/components/sections/__tests__/EmailCapture.test.tsx` | Zod validation, success state |

---

## Task 1: Scaffold apps/web

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.app.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@runcoach/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.469.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "clsx": "^2.1.1",
    "jsdom": "^26.0.0",
    "tailwind-merge": "^2.5.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.9",
    "class-variance-authority": "^0.7.1"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 3: Create apps/web/tsconfig.app.json**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create apps/web/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create apps/web/index.html**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RunCoach AI — Votre coach running personnel</title>
    <meta name="description" content="RunCoach AI analyse vos données Strava et génère des recommandations d'entraînement personnalisées grâce à l'IA." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create apps/web/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Create apps/web/src/App.tsx (empty shell for now)**

```tsx
export default function App() {
  return <div data-testid="app">RunCoach AI</div>;
}
```

- [ ] **Step 8: Install dependencies**

```bash
cd apps/web && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/index.html apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/tsconfig.node.json apps/web/src/main.tsx apps/web/src/App.tsx
git commit -m "feat(web): scaffold apps/web with Vite + React 19 + TypeScript"
```

---

## Task 2: Vite config + Tailwind CSS 4 + design tokens

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/index.css`

- [ ] **Step 1: Create apps/web/vite.config.ts**

```typescript
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Create apps/web/vitest.config.ts**

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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create apps/web/src/test-setup.ts**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Create apps/web/src/index.css with Tailwind v4 + design tokens**

Tailwind CSS 4 uses CSS-first configuration. Design tokens are defined in `@theme {}` and become Tailwind utility classes automatically (e.g., `bg-background`, `text-primary`).

```css
/* Fonts */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap");

@import "tailwindcss";

/* ============================================================
   DESIGN TOKENS — Figma-ready via Tokens Studio
   These map 1:1 to Tailwind utilities:
     bg-background, bg-surface, bg-primary
     text-primary, text-muted, text-foreground
     border-border
   ============================================================ */
@theme {
  /* Colors */
  --color-background: #0a0a0f;
  --color-surface: #13131a;
  --color-primary: #ff5722;
  --color-primary-hover: #e64a19;
  --color-foreground: #f5f5f5;
  --color-muted: #9e9e9e;
  --color-border: #2a2a35;

  /* Typography */
  --font-family-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-family-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
}

/* Base styles */
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-family-sans);
}
```

- [ ] **Step 5: Verify Vite starts**

```bash
cd apps/web && npm run dev
```

Expected: `Local: http://localhost:5173/` — white page with "RunCoach AI" text is fine.

- [ ] **Step 6: Verify typecheck passes**

```bash
cd apps/web && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/vite.config.ts apps/web/vitest.config.ts apps/web/src/index.css apps/web/src/test-setup.ts
git commit -m "feat(web): add Tailwind CSS 4 config + design tokens"
```

---

## Task 3: shadcn/ui init + lib/utils

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`

- [ ] **Step 1: Create apps/web/components.json**

For Tailwind v4, leave `tailwind.config` empty — shadcn reads tokens from CSS.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Create apps/web/src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Write test for cn()**

Create `apps/web/src/lib/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { cn } from "../utils.js";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignores falsy values", () => {
    expect(cn("px-2", false, undefined, "py-2")).toBe("px-2 py-2");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test
```

Expected: 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components.json apps/web/src/lib/utils.ts apps/web/src/lib/__tests__/utils.test.ts
git commit -m "feat(web): add shadcn/ui config and cn() utility"
```

---

## Task 4: shadcn/ui primitive components

**Files:**
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/input.tsx`

> These are standard shadcn/ui "new-york" components. Copy them verbatim — do NOT modify styles. They use `cn()` from `@/lib/utils`.

- [ ] **Step 1: Create apps/web/src/components/ui/button.tsx**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow hover:bg-primary-hover",
        ghost: "hover:bg-surface hover:text-foreground",
        outline:
          "border border-border bg-transparent shadow-sm hover:bg-surface hover:text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Install Radix UI Slot (required by Button)**

```bash
cd apps/web && npm install @radix-ui/react-slot
```

- [ ] **Step 3: Create apps/web/src/components/ui/card.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border bg-surface text-foreground shadow",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardContent };
```

- [ ] **Step 4: Create apps/web/src/components/ui/badge.tsx**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-white",
        secondary:
          "border-transparent bg-surface text-muted",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

- [ ] **Step 5: Create apps/web/src/components/ui/input.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 6: Verify typecheck**

```bash
cd apps/web && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui/ apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): add shadcn/ui primitive components (Button, Card, Badge, Input)"
```

---

## Task 5: SectionWrapper + Navbar

**Files:**
- Create: `apps/web/src/components/shared/SectionWrapper.tsx`
- Create: `apps/web/src/components/shared/Navbar.tsx`

- [ ] **Step 1: Create apps/web/src/components/shared/SectionWrapper.tsx**

```tsx
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SectionWrapper({ children, className, id }: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn("mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8", className)}
    >
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Create apps/web/src/components/shared/Navbar.tsx**

The Navbar uses a `scroll` event listener to add backdrop blur when the user scrolls past the hero.

```tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <span className="font-display text-xl font-bold text-foreground">
          RunCoach <span className="text-primary">AI</span>
        </span>
        <Button size="sm" asChild>
          <a href="#cta">Rejoindre la beta</a>
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/
git commit -m "feat(web): add SectionWrapper and Navbar shared components"
```

---

## Task 6: HeroSection

**Files:**
- Create: `apps/web/src/components/sections/HeroSection.tsx`
- Create: `apps/web/src/components/sections/__tests__/HeroSection.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/sections/__tests__/HeroSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "../HeroSection";

describe("HeroSection", () => {
  it("renders the main headline", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the primary CTA button linking to #cta", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", { name: /rejoindre la beta/i });
    expect(cta).toHaveAttribute("href", "#cta");
  });

  it("renders the demo link", () => {
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: /voir la démo/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|Error"
```

Expected: FAIL (HeroSection not defined).

- [ ] **Step 3: Install Framer Motion (already in package.json — verify)**

```bash
cd apps/web && node -e "require('./node_modules/framer-motion/package.json')" && echo "ok"
```

Expected: `ok`. If not found, run `npm install`.

- [ ] **Step 4: Create apps/web/src/components/sections/HeroSection.tsx**

```tsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function HeroSection() {
  return (
    <SectionWrapper className="flex min-h-screen flex-col items-center justify-center pt-20 text-center lg:flex-row lg:text-left">
      <motion.div
        className="flex-1 space-y-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      >
        <motion.h1
          variants={fadeUp}
          className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Votre coach running
          <br />
          <span className="text-primary">propulsé par l'IA</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="max-w-xl text-lg text-muted"
        >
          RunCoach AI analyse vos données Strava et génère des recommandations
          d'entraînement personnalisées grâce à trois agents IA spécialisés.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-4 lg:justify-start justify-center">
          <Button size="lg" asChild>
            <a href="#cta">Rejoindre la beta</a>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <a href="#how-it-works">Voir la démo</a>
          </Button>
        </motion.div>
      </motion.div>

      {/* Visual placeholder */}
      <motion.div
        className="mt-12 flex-1 lg:mt-0 lg:pl-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="mx-auto h-80 w-full max-w-md rounded-2xl border border-border bg-surface flex items-center justify-center text-muted">
          [App mockup]
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd apps/web && npm test
```

Expected: HeroSection: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/sections/HeroSection.tsx apps/web/src/components/sections/__tests__/HeroSection.test.tsx
git commit -m "feat(web): add HeroSection with Framer Motion animation"
```

---

## Task 7: FeaturesSection

**Files:**
- Create: `apps/web/src/components/sections/FeaturesSection.tsx`
- Create: `apps/web/src/components/sections/__tests__/FeaturesSection.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/sections/__tests__/FeaturesSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "../FeaturesSection";

describe("FeaturesSection", () => {
  it("renders exactly 6 feature cards", () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(6);
  });

  it("renders the section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders CTL/ATL feature", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/CTL\/ATL/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|FeaturesSection"
```

Expected: FAIL.

- [ ] **Step 3: Create apps/web/src/components/sections/FeaturesSection.tsx**

```tsx
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, Brain, RefreshCw, Calendar, TrendingUp, Shield } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const features = [
  {
    icon: TrendingUp,
    title: "CTL/ATL/TSB",
    description: "Suivi de la charge d'entraînement en temps réel. Identifiez surmenage et sous-entraînement avant qu'ils impactent vos performances.",
  },
  {
    icon: Brain,
    title: "Agents IA spécialisés",
    description: "Trois agents dédiés — Coach, Physio, Mental — analysent votre profil sous des angles complémentaires pour des conseils précis.",
  },
  {
    icon: RefreshCw,
    title: "Sync Strava",
    description: "Connexion OAuth Strava en un clic. Vos 90 derniers jours d'activités synchronisés automatiquement, nouvelles activités en temps réel.",
  },
  {
    icon: Calendar,
    title: "Recommandations quotidiennes",
    description: "Chaque matin, une recommandation d'entraînement calibrée sur vos données récentes, vos objectifs et votre état de forme.",
  },
  {
    icon: Activity,
    title: "Plans d'entraînement",
    description: "Plans structurés sur mesure : endurance fondamentale, fractionné, récupération. Adaptés à votre niveau et vos objectifs.",
  },
  {
    icon: Shield,
    title: "Détection blessures",
    description: "Analyse prédictive des signaux d'alerte — surcharge, douleurs répétées, baisse de performances — pour prévenir avant de guérir.",
  },
];

function FeatureCard({ icon: Icon, title, description }: typeof features[0]) {
  return (
    <Card
      role="article"
      className="group transition-all duration-200 hover:border-primary/50"
    >
      <CardHeader>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          <Icon size={20} />
        </div>
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div className="bg-surface">
      <SectionWrapper id="features">
        <div ref={ref} className="space-y-12">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-muted">
              Un système complet, de l'analyse de données à la recommandation personnalisée.
            </p>
          </div>

          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
          >
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </motion.div>
        </div>
      </SectionWrapper>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test
```

Expected: all tests passing (utils + Hero + Features).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/sections/FeaturesSection.tsx apps/web/src/components/sections/__tests__/FeaturesSection.test.tsx
git commit -m "feat(web): add FeaturesSection with 6 feature cards"
```

---

## Task 8: HowItWorksSection

**Files:**
- Create: `apps/web/src/components/sections/HowItWorksSection.tsx`

- [ ] **Step 1: Create apps/web/src/components/sections/HowItWorksSection.tsx**

```tsx
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const steps = [
  {
    number: "01",
    title: "Connectez Strava",
    description: "Autorisez RunCoach AI à accéder à vos activités Strava en un clic. Vos 90 derniers jours sont importés automatiquement.",
  },
  {
    number: "02",
    title: "L'IA analyse vos données",
    description: "Nos trois agents spécialisés calculent votre charge d'entraînement, détectent les risques et évaluent votre état de forme.",
  },
  {
    number: "03",
    title: "Recevez vos recommandations",
    description: "Chaque jour, une recommandation personnalisée : séance à réaliser, conseils de récupération, alertes de surmenage.",
  },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <SectionWrapper id="how-it-works">
      <div ref={ref} className="space-y-12">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Comment ça marche ?
          </h2>
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:gap-0">
          {/* Connector line (desktop only) */}
          <div className="absolute left-0 right-0 top-8 hidden border-t border-dashed border-border lg:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative flex flex-1 flex-col items-center text-center lg:px-8"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-background font-display text-xl font-bold text-primary">
                {step.number}
              </div>
              <h3 className="mb-3 font-display text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/sections/HowItWorksSection.tsx
git commit -m "feat(web): add HowItWorksSection with 3-step timeline"
```

---

## Task 9: SocialProofSection

**Files:**
- Create: `apps/web/src/components/sections/SocialProofSection.tsx`

- [ ] **Step 1: Install Embla Carousel (used by shadcn Carousel)**

```bash
cd apps/web && npm install embla-carousel-react
```

- [ ] **Step 2: Create apps/web/src/components/ui/carousel.tsx**

Embla Carousel wrapper (shadcn/ui new-york style):

```tsx
"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];

interface CarouselProps {
  opts?: CarouselOptions;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within <Carousel />");
  return context;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = "horizontal", opts, setApi, className, children, ...props }, ref) => {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y" }
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  React.useEffect(() => {
    if (!api) return;
    setApi?.(api);
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api, onSelect, setApi]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation,
        scrollPrev: () => api?.scrollPrev(),
        scrollNext: () => api?.scrollNext(),
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        ref={ref}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel();
    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={ref}
          className={cn(
            "flex",
            orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel();
    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn(
          "min-w-0 shrink-0 grow-0 basis-full",
          orientation === "horizontal" ? "pl-4" : "pt-4",
          className
        )}
        {...props}
      />
    );
  }
);
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { scrollPrev, canScrollPrev } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("absolute left-2 top-1/2 -translate-y-1/2 rounded-full", className)}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  }
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { scrollNext, canScrollNext } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("absolute right-2 top-1/2 -translate-y-1/2 rounded-full", className)}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  }
);
CarouselNext.displayName = "CarouselNext";

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
```

- [ ] **Step 3: Create apps/web/src/components/sections/SocialProofSection.tsx**

```tsx
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const stats = [
  { value: "500+", label: "Coureurs en beta" },
  { value: "92%", label: "Satisfaction" },
  { value: "−18%", label: "Blessures déclarées" },
];

const testimonials = [
  {
    quote: "Depuis que j'utilise RunCoach AI, j'ai réduit mes blessures de moitié. Les recommandations sont vraiment adaptées à mon niveau.",
    name: "Marie D.",
    stat: "52 km/semaine · Semi-marathon",
  },
  {
    quote: "L'agent Physio m'a alerté sur une surcharge avant que je ne me blesse. Je n'aurais pas vu ça moi-même.",
    name: "Thomas R.",
    stat: "35 km/semaine · Trail",
  },
  {
    quote: "Les plans d'entraînement sont cohérents avec ma vie réelle — pas juste un programme générique. C'est bluffant.",
    name: "Sophie M.",
    stat: "42 km/semaine · Marathon",
  },
];

export function SocialProofSection() {
  return (
    <div className="bg-surface">
      <SectionWrapper id="social-proof" className="space-y-16">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="space-y-8">
          <h2 className="font-display text-3xl font-bold text-center text-foreground">
            Ce qu'ils en disent
          </h2>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {testimonials.map((t) => (
                <CarouselItem key={t.name} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col justify-between p-6 pt-6">
                      <p className="text-foreground leading-relaxed">"{t.quote}"</p>
                      <div className="mt-6">
                        <div className="font-semibold text-foreground">{t.name}</div>
                        <div className="text-xs text-muted">{t.stat}</div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </SectionWrapper>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test
```

Expected: all previous tests still passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/carousel.tsx apps/web/src/components/sections/SocialProofSection.tsx apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): add SocialProofSection with testimonial carousel and stats"
```

---

## Task 10: CTASection + EmailCapture

**Files:**
- Create: `apps/web/src/components/sections/CTASection.tsx`
- Create: `apps/web/src/components/sections/__tests__/CTASection.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/components/sections/__tests__/CTASection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CTASection } from "../CTASection";

describe("CTASection — EmailCapture", () => {
  it("renders the email input and submit button", () => {
    render(<CTASection />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /s'inscrire/i })).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    render(<CTASection />);
    const input = screen.getByRole("textbox", { name: /email/i });
    const button = screen.getByRole("button", { name: /s'inscrire/i });
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows success message after valid email submission", async () => {
    render(<CTASection />);
    const input = screen.getByRole("textbox", { name: /email/i });
    const button = screen.getByRole("button", { name: /s'inscrire/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/merci/i)).toBeInTheDocument();
    });
  });

  it("does not show error for empty field before interaction", () => {
    render(<CTASection />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|CTASection"
```

Expected: FAIL.

- [ ] **Step 3: Create apps/web/src/components/sections/CTASection.tsx**

```tsx
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const emailSchema = z.string().email("Adresse email invalide.");

export function CTASection() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError(null);
    setLoading(true);
    // Simulated async submit — replace with real API call when ready
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      console.info("[waitlist] email captured:", email);
    }, 600);
  }

  return (
    <SectionWrapper id="cta" className="text-center">
      <div className="mx-auto max-w-2xl space-y-8">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Rejoignez la beta
          <br />
          <span className="text-primary">en avant-première</span>
        </h2>
        <p className="text-muted">
          Accès limité aux 500 premiers coureurs. Inscrivez-vous pour être notifié à l'ouverture.
        </p>

        {submitted ? (
          <p className="text-lg font-semibold text-primary">
            Merci ! Vous serez notifié à l'ouverture de la beta.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            noValidate
          >
            <div className="flex-1 sm:max-w-xs">
              <label htmlFor="waitlist-email" className="sr-only">
                Email
              </label>
              <Input
                id="waitlist-email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? "email-error" : undefined}
              />
              {error && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1 text-left text-xs text-red-400"
                >
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "..." : "S'inscrire"}
            </Button>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test
```

Expected: CTASection: 4 passing, all previous tests still passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/sections/CTASection.tsx apps/web/src/components/sections/__tests__/CTASection.test.tsx
git commit -m "feat(web): add CTASection with email capture and Zod validation"
```

---

## Task 11: Footer

**Files:**
- Create: `apps/web/src/components/sections/Footer.tsx`

- [ ] **Step 1: Create apps/web/src/components/sections/Footer.tsx**

```tsx
import { Github } from "lucide-react";

const links = [
  { label: "Conditions générales d'utilisation", href: "/cgu" },
  { label: "Politique de confidentialité", href: "/privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface" role="contentinfo">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div>
          <span className="font-display text-lg font-bold text-foreground">
            RunCoach <span className="text-primary">AI</span>
          </span>
          <p className="mt-1 text-xs text-muted">
            Votre coach running propulsé par l'IA.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="https://github.com/tpasquet/ai-running-assistant"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
          className="text-muted hover:text-foreground transition-colors"
        >
          <Github size={20} />
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/sections/Footer.tsx
git commit -m "feat(web): add Footer with links and social"
```

---

## Task 12: App.tsx composition + integration test

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Write failing integration test**

Create `apps/web/src/__tests__/App.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  it("renders Navbar", () => {
    render(<App />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders HeroSection (h1 present)", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders FeaturesSection (6 feature cards)", () => {
    render(<App />);
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("renders CTASection (email input)", () => {
    render(<App />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
  });

  it("renders Footer", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|App"
```

Expected: FAIL (App renders "RunCoach AI" text only).

- [ ] **Step 3: Update apps/web/src/App.tsx**

```tsx
import { Navbar } from "@/components/shared/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { SocialProofSection } from "@/components/sections/SocialProofSection";
import { CTASection } from "@/components/sections/CTASection";
import { Footer } from "@/components/sections/Footer";

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
cd apps/web && npm test
```

Expected: all tests passing (utils + Hero + Features + CTA + App integration).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/__tests__/App.test.tsx
git commit -m "feat(web): compose App with all sections and add integration tests"
```

---

## Task 13: Build verification + push

**Files:** No new files — verification only.

- [ ] **Step 1: Typecheck**

```bash
cd apps/web && npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Full test run**

```bash
cd apps/web && npm test
```

Expected: all tests passing, 0 failures.

- [ ] **Step 3: Production build**

```bash
cd apps/web && npm run build
```

Expected: `dist/` created, no errors. Output shows JS + CSS bundle sizes.

- [ ] **Step 4: Smoke test the build**

```bash
cd apps/web && npm run preview
```

Expected: `Local: http://localhost:4173/` — open in browser, verify all 6 sections visible.

- [ ] **Step 5: Push**

```bash
git push origin feature/web-vitrine
```

Expected: branch updated on GitHub.
