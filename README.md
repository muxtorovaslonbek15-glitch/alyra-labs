# Alyra Labs

An open-source virtual chemistry laboratory for experiments,
reactions, education, and scientific visualization.

Digital perfume atelier for [ALYRA](https://www.alyra.in/): pour notes, compose formulas, invent signatures on a chemistry desk. Real balanced equations. Plain-language tutor. The desk reacts to every move.

[![License: MIT](https://img.shields.io/badge/License-MIT-1a1a1a.svg)](./LICENSE)
[![Demo](https://img.shields.io/badge/demo-live-1a1a1a.svg)](https://alyra-labs.vercel.app)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-1a1a1a.svg)](./CONTRIBUTING.md)

**[Live Demo](https://alyra-labs.vercel.app)** · **[Documentation](./DESIGN.md)** · **[Quick Start](#quick-start)** · **[Contributing](./CONTRIBUTING.md)**

<p align="center">
  <img src="branding/screenshots/01-desk-hero.png" alt="Alyra Labs desk — glassware on ebony wood" width="800" />
</p>

<p align="center">
  <img src="branding/screenshots/05-feature-demo.gif" alt="Feature demo — pour, mix, compose" width="800" />
</p>

## Why it exists

Classroom chemistry is usually worksheets and static diagrams. Fragrance design is usually opaque marketing. Alyra Labs sits between them: a tactile desk where you pour, stir, heat, and watch stoichiometry and scent structure resolve in real time — companion to a physical perfume brand, useful as an educational lab, open for anyone to fork.

## What makes it different

- **Tactile first** — drag glassware onto wood; pour streams and vessel FX are first-class, not decoration
- **Real equations** — balanced reaction banners (`HCl + NaOH → NaCl + H2O`), not quiz fluff
- **Perfume atelier** — top / heart / base notes, invent & shelf formulas, market remixes
- **AI tutor + OCR** — plain-language explain; scan a bottle label into the desk
- **MIT open source** — fork it for a class, a brand atelier, or a research demo

## Features

| Feature | What you get |
|---------|----------------|
| Virtual desk | Beakers, pour, stir, heat, cool, shake — phone and desktop |
| Reaction engine | Stoichiometry, hazards, live equation feedback |
| Perfume mode | Note families, IFRA-aware recipes, invention shelf |
| Guided goals | Step-by-step experiments for learning paths |
| AI tutor | Signed-in explain API (Groq) grounded on desk state |
| Master Perfumer | `/perfumer` chatbot — formulas, solids, cost, RAG, web search via ZPL backend |
| Teacher CMS | Class codes, progress, soft-launch classroom tools |

<p align="center">
  <img src="branding/screenshots/04-reaction-moment.gif" alt="Reaction moment animation" width="640" />
  &nbsp;
  <img src="branding/screenshots/03-reaction-equation.png" alt="Balanced reaction equation UI" width="320" />
</p>

## Quick start

```bash
git clone https://github.com/Ghost-ops721/alyra-labs.git
cd alyra-labs
cp .env.example .env.local
# Fill Firebase client keys; add GROQ_API_KEY + Firebase Admin for tutor/OCR/progress
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Marketing site is `/`; the desk is at `/lab`.

### Required env

| Variable | Where used |
|----------|------------|
| `NEXT_PUBLIC_FIREBASE_*` | Client Auth + Firestore |
| `GROQ_API_KEY` | `/api/explain`, `/api/ocr` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `FIREBASE_ADMIN_*` | Verify ID tokens; write progress |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error tracking (optional) |
| `NEXT_PUBLIC_PERFUMER_API_URL` | Master Perfumer UI → ZPL `/api/perfumer` (default `http://localhost:3001/api/perfumer`) |

Without Admin credentials, the desk UI still runs; AI and progress sync APIs return 503.

### Master Perfumer (optional)

Backend lives in `ZPL_BACKEND` (`alyra-perfumer/`). Start it, then open `/perfumer`:

```bash
cd /Users/neil/Desktop/ZPL/ZPL_BACKEND
npm run perfumer:seed   # once
PORT=3001 npm run dev
# requires GROQ_API_KEY; optional TAVILY_API_KEY or SERPER_API_KEY for web search
```

### Scripts

```bash
npm run dev          # development
npm run build        # production build
npm run start        # serve build
npm run lint
npm run typecheck
npm test             # Vitest unit tests
npx playwright test  # smoke E2E
```

## Architecture overview

```
src/
  desk/           # Workspace, vessel slots, DnD
  animation/      # Liquid, pour, vessel FX, fluid3d WebGL
  domains/chemistry/  # Engine: reactions, hazards, perfume, goals
  goals/          # Guided experiment progress
  perfume/        # Market / atelier panels
  panel/          # Item inspector
  store/          # Zustand desk + inventory + units
  app/            # Next.js App Router (/, /lab, APIs)
```

- **Client:** Next.js 16 App Router, React 19, Zustand, Tailwind 4, Three.js fluid preview
- **Auth / data:** Firebase Auth + Firestore (`chem-lab-neil`)
- **AI:** Groq via `/api/explain` and `/api/ocr` (token-gated, rate-limited)
- **Design system:** [DESIGN.md](./DESIGN.md) · Brand: [branding/BRAND_BRIEF.md](./branding/BRAND_BRIEF.md)

Deploy checklist: [DEPLOY.md](./DEPLOY.md).

## Roadmap

- [ ] Deeper reaction catalog + more classroom goal packs
- [ ] Contributor docs for adding chemicals / reactions
- [ ] Export / share invention cards for educators
- [ ] Hardening soft-launch teacher CMS for multi-class
- [ ] Optional offline demo mode with fewer Firebase deps

See [open issues](https://github.com/Ghost-ops721/alyra-labs/issues) — look for `good first issue`.

## Contributing

PRs welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md).

Labels you will see: `good first issue`, `help wanted`, `documentation`, `beginner`.

## Security notes (soft launch)

- `/api/explain`, `/api/ocr`, and `/api/progress` require a Firebase ID token.
- Rate limits: explain 30/min, OCR 10/min, progress 60/min (per user, in-memory).
- Firestore rules block client writes to `xp` / `discoveredIds` / `badgeIds` — progress goes through `/api/progress`.
- Deploy rules after pulling: `npx firebase-tools deploy --only firestore:rules`

## Auth funnel

Guests can add 2 chemicals, then must sign up. Live tutor and OCR require a signed-in user.

Public marketing lives at `/`. The desk is at `/lab`. Waitlist: `POST /api/waitlist`. Teacher CMS: `/teacher`. Class join: `/join?code=`.

## License

[MIT](./LICENSE) © 2026 Neil Carnac

---

If Alyra Labs helped you, consider giving it a ⭐ so more educators and developers can discover it.

**Maintained by Neil Carnac**
