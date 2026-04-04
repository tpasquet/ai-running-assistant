# Design : Site Vitrine Web (RunCoach AI)

**Date** : 2026-04-03
**Statut** : Approuvé
**Contexte** : Iteration 1 (AI Core) complète. Ce document couvre le site vitrine marketing de RunCoach AI — page de présentation produit avec capture d'email, sans espace utilisateur.

---

## Objectif

Présenter RunCoach AI au public, expliquer les fonctionnalités clés, et capturer des emails pour la beta. La connexion utilisateur et l'espace perso sont hors scope — ce site est uniquement une vitrine.

---

## Approche retenue : SPA Vite + React 19 + Tailwind CSS 4 + shadcn/ui

Single Page Application légère, sans SSR ni routing multi-pages. Déploiement statique possible (Vercel, Netlify, GitHub Pages). Design system basé sur Tailwind + shadcn/ui avec tokens Figma anticipés via Tokens Studio.

---

## Architecture & Structure

```
apps/web/
├── index.html
├── vite.config.ts
├── tailwind.config.ts          # design tokens centralisés (Figma-ready)
├── src/
│   ├── main.tsx                # point d'entrée
│   ├── App.tsx                 # composition des sections
│   ├── components/
│   │   ├── ui/                 # shadcn/ui (Button, Card, Badge, Input)
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   ├── HowItWorksSection.tsx
│   │   │   ├── SocialProofSection.tsx
│   │   │   ├── CTASection.tsx
│   │   │   └── Footer.tsx
│   │   └── shared/
│   │       ├── Navbar.tsx
│   │       └── SectionWrapper.tsx
│   ├── lib/
│   │   └── utils.ts            # cn() helper (shadcn)
│   └── assets/                 # images, icônes SVG
├── package.json
└── tsconfig.json
```

**Relation avec le monorepo** : `apps/web/` cohabite avec la racine backend (Node.js / Fastify). Le frontend a son propre `package.json`, `tsconfig.json`, et scripts de build. Pas de code partagé pour l'instant — les types Strava/LangGraph restent dans le backend.

---

## Design System & Tokens Figma

### Palette (dark theme par défaut)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--color-background` | `#0A0A0F` | fond principal |
| `--color-surface` | `#13131A` | cards, sections alternées |
| `--color-primary` | `#FF5722` | CTA, accents, icônes |
| `--color-primary-hover` | `#E64A19` | hover état bouton primaire |
| `--color-text` | `#F5F5F5` | texte principal |
| `--color-muted` | `#9E9E9E` | sous-titres, labels |
| `--color-border` | `#2A2A35` | bordures cards |

### Typographie

| Rôle | Police | Poids |
|------|--------|-------|
| Titres (H1–H3) | Space Grotesk | 700 |
| Corps | Inter | 400 / 500 |
| Labels / badges | Inter | 600 |

### Intégration Figma

- Plugin **Tokens Studio for Figma** exporte les tokens en JSON
- Le JSON est importé dans `tailwind.config.ts` via `tailwind-tokens` ou mapping manuel
- Les tokens CSS custom properties sont générés automatiquement
- Workflow : Figma → JSON → `tailwind.config.ts` → classes Tailwind

---

## Découpage des composants

### `HeroSection`
- `HeroHeadline` — titre principal animé (fade-in up, 2 lignes max)
- `HeroSubline` — accroche, couleur `text-muted`
- `HeroCTA` — bouton primaire "Rejoindre la beta" + lien secondaire "Voir la démo"
- `HeroVisual` — mockup app (image statique), positionné à droite sur desktop

### `FeaturesSection`
- `FeatureGrid` — grille 3 colonnes (mobile: 1 col, tablet: 2 col)
- `FeatureCard` — icône SVG + titre + description courte, hover border glow orange
- 6 features : CTL/ATL/TSB, agents IA spécialisés, sync Strava, recommandations quotidiennes, plans d'entraînement, détection blessures

### `HowItWorksSection`
- `StepsTimeline` — 3 étapes horizontales (mobile: vertical)
- `StepItem` — numéro + titre + description, connectés par ligne pointillée

### `SocialProofSection`
- `TestimonialCarousel` — Embla Carousel (inclus shadcn/ui)
- `TestimonialCard` — avatar + quote + nom + stat running (ex: "42km/semaine")
- `StatsBar` — 3 chiffres clés (ex: "500+ coureurs", "92% satisfaction")

### `CTASection`
- `CTAHeadline` — copy urgence / exclusivité beta
- `EmailCapture` — input email + bouton "S'inscrire", validation Zod côté client
- Soumission : `fetch POST /api/waitlist` (route Fastify à créer, hors scope vitrine) **ou** service tiers (Resend / Mailchimp) — à décider en implémentation

### `Footer`
- `FooterBrand` — logo + tagline
- `FooterLinks` — CGU, Politique de confidentialité
- `SocialLinks` — Strava / GitHub (optionnel Twitter)

### Composants partagés
- `Navbar` — logo + lien CTA fixe en haut (sticky, fond semi-transparent au scroll)
- `SectionWrapper` — padding uniforme, max-width centré

### `components/ui/` (shadcn/ui)
- `Button` (variants: default/ghost/outline)
- `Badge`
- `Card`, `CardContent`, `CardHeader`
- `Input`

---

## Contenu

Phase initiale : contenu placeholder (textes et images) intégré directement dans les composants React. Pas de CMS ni de fichier de config séparé pour cette itération. Le contenu sera mis à jour directement dans le code jusqu'à ce qu'un CMS soit justifié.

---

## Animations

- Fade-in + slide-up au scroll via **Framer Motion** (`useInView` + `motion.div`)
- Pas d'animations lourdes — rester sous 100ms de JS bloquant
- Transition Navbar : opacité + backdrop-blur au scroll (CSS transition)

---

## Tests

| Fichier | Ce qu'on teste |
|---------|---------------|
| `EmailCapture.test.tsx` | validation email (Zod), état loading, message succès/erreur |
| `HeroSection.test.tsx` | rendu des éléments clés, lien CTA |
| `FeatureCard.test.tsx` | rendu titre + description |
| `App.test.tsx` | toutes les sections présentes dans le DOM |

Tests avec **Vitest** + **@testing-library/react**. Pas de tests E2E pour cette itération.

---

## Definition of Done

- [ ] `npm run dev` affiche le site sur `localhost:5173`
- [ ] `npm run build` produit un bundle statique valide
- [ ] Toutes les 6 sections rendues et visuellement cohérentes
- [ ] `EmailCapture` valide et rejette les emails invalides
- [ ] Responsive : mobile (375px), tablet (768px), desktop (1280px)
- [ ] Tokens Figma documentés dans `tailwind.config.ts` (commentaires)
- [ ] Tous les tests passent (`npm test`)
- [ ] `npm run typecheck` sans erreur
