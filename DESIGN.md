# Alyra Labs Design System

Canonical brand: [`branding/BRAND_BRIEF.md`](./branding/BRAND_BRIEF.md). Shop reference: [alyra.in](https://www.alyra.in/).

## Product Context

- **What this is:** Digital perfume chemistry desk for ALYRA — pour notes, compose formulas, invent signatures on wood.
- **Who it's for:** ALYRA customers and scent composers on phone and desktop.
- **Space/industry:** Fine fragrance / solid perfume companion lab.
- **Project type:** Phone-first responsive web app; desktop keeps the full instrument layout.

## Memorable thing

> You composed a signature on the desk — nothing else got in the way.

Every screen decision serves that: the desk is the hero, scent motion is the payoff, chrome stays quiet until you earn a discovery.

## Visual thesis

Monochrome luxury atelier — ink black, cool stone, champagne glass, ebony wood. Angel-with-lyre mark as brand lockup. Material and energy: tactile wood + translucent glass + precise mono formulas. Not a dashboard. Not a game HUD.

## Aesthetic Direction

- **Direction:** Quiet atelier minimal
- **Decoration level:** Minimal (type, wood, glass only)
- **Mood:** Precise, unhurried, close to skin — phone feels like an empty desk; desktop feels like a quiet instrument bench
- **Reference:** [alyra.in](https://www.alyra.in/)

## Typography

| Role | Font | Use |
|------|------|-----|
| Display | Cormorant Garamond | Alyra Labs wordmark, empty-state headline, XP |
| UI | DM Sans | Labels, buttons, body |
| Formula | JetBrains Mono | Equations, chemical formulas |

Never Inter / Roboto / Arial / system as primary.

**Phone scale:** chrome display max `text-xl`; empty-desk headline `text-2xl`; body `text-sm`; labels `text-xs`.

## Color

```css
--lab-wash: #ebe8e2;      /* cool stone atmosphere */
--lab-panel: #f7f5f1;     /* paper panels */
--lab-desk: #2a221c;      /* ebony atelier desk */
--lab-ink: #0c0c0c;       /* primary text */
--lab-muted: #5c5750;     /* secondary */
--lab-teal: #1a1a1a;      /* accent / CTAs (ink) */
--lab-line: #d2cdc4;      /* borders */
--lab-foam: #f5f4f1;      /* light text on dark */
--lab-glass: #c4b49a;     /* champagne glass tint */
--lab-amber: #b8956c;     /* heat / reward gold */
--lab-hazard: #b42318;    /* safe-fail */
```

Approach: restrained — ink CTAs, amber only for heat/reward, hazard only for fail.

## Layout — breakpoint split (canonical)

| Surface | `< md` (phone) | `md+` (desktop / webapp) |
|---------|----------------|---------------------------|
| Composition | **Desk only** — full-bleed wood | Inventory \| desk \| tutor |
| Inventory | Bottom sheet / full sheet via FAB | Left rail ~14–15rem |
| Lab tutor | Bottom sheet via FAB — not in the column stack | Right rail ~13.5–15rem |
| Gamification | Compact: XP chip + Perfume + overflow | Full bar as today |
| Recipe log | Hidden (reach via overflow / journal elsewhere) | Bottom accordion as today |
| Density | Comfortable — touch ≥44px, more air | Compact instrument chrome |
| Scrollbars | **Never visible** (scroll still works) | Never visible in lab chrome |

Desktop / webapp layout, density, tool rail, and panels **stay as they are**. Phone is the deliberate departure.

### Phone rules

1. First viewport: brand mark, desk, one CTA path — no side columns, no tutor strip eating height.
2. Inventory and tutor open as sheets over the desk (desk dims behind).
3. Safe-area insets on bottom rail and FABs (`env(safe-area-inset-*)`).
4. No visible scrollbars anywhere in `.lab-app` (use hidden scrollbar utilities).
5. No page-level scroll on the lab shell — `h-dvh` + `overflow-hidden`; only sheets scroll internally.

## Density

### Desktop (unchanged)

Chrome is tight so the desk stays dominant:

| Token | Target |
|-------|--------|
| Panel body | `text-xs` (11–12px) |
| Section labels | `text-[10px]` uppercase |
| Display (wordmark) | `text-2xl` max in chrome |
| Buttons | `px-2 py-1` / `text-xs` |
| Side panels | ~14–15rem wide |
| Gaps | `gap-1`–`gap-1.5`, header `py-1.5`–`py-2` |

### Phone

| Token | Target |
|-------|--------|
| Touch targets | ≥44px height where primary |
| FAB | 40–44px square, quiet panel fill |
| Sheet handle | grabber + title + Done |
| Gaps | `gap-2`–`gap-3` |
| Tool rail | clustered, `gap-1.5`, full width with horizontal pad |

Never inflate desktop chrome with `text-3xl+` titles. Never fuse a full tool row at `gap-0.5`.

## Desk tool rail + vessel actions

The bottom desk rail and the beaker card footer are **instrument clusters**, not a single pill bar.

| Cluster | Controls |
|---------|----------|
| Place | `+ Beaker` |
| Process | Stir · Heat · Cool · Shake |
| React | Mix (ink primary) |
| Reset | Clear board (hazard tint, confirm-gated) |

Rules:
- Separators (1px `white/15` or `lab-line`) between clusters; `gap-1.5` inside a cluster
- Heat/Cool are toggles: inactive = quiet wash; active = semantic fill **and** physical FX under the glass
- Mix stays the only pulsing CTA; Clear never sits flush against Mix without a divider

## Heat / Cool (physical states)

Heat and Cool live **on the vessel**, not only on the button paint.

| State | Under glass | In well | Button |
|-------|-------------|---------|--------|
| Heat on | Bunsen stand + layered flame (amber → cream tip) | Soft amber wash + heat haze | Amber fill + ring |
| Cool on | Ice bath tray + soft cubes | Frost rim + cool flash on toggle | Ice fill (`#0c4a6e` / `#7dd3fc`), not neon blue |
| Off | Nothing under glass | No wash | Quiet `lab-wash` / rail `white/10` |

Motion: 200–300ms toggle; flame/frost idle loops. `prefers-reduced-motion` → static tint, no dance/haze.

## Flow

1. Open Equipment → place beaker on desk (phone: sheet / + Beaker)
2. Open Notes / Oils → pour into vessel
3. Mix / React → animation + equation + tutor (phone: open tutor sheet)
4. XP / badge toast only on first discovery

## Motion

- Glassware is equipment-shaped SVG (`GlassVessel`) with clipped liquid wells — not rectangular cards
- Liquid free-surface waves idle continuously; pour/stir/shake/boil amplify motion
- Chrome motion: minimal-functional (150–250ms sheet open/close)
- Reaction FX stay secondary to the glass silhouette

## Goals

Lab goals live in the top bar **Goals** picker.

**Perfume is different:** inspired scents are selected in **Perfume Atelier**. Never route “Perfume” intent into the legacy citrus cologne product goal.

### Active Goal coach

Quiet seafoam glass coach — supports the desk, never competes with the beaker. On phone: compact chip / panel that does not cover the tool rail.

## Production UI states (tutor + OCR)

| State | Behavior |
|-------|----------|
| Loading | Compact “Consulting the lab tutor…” pulse — no skeleton cards |
| Signed out | Offline/static notes + sign-in gate |
| Rate limited | Keep last/fallback text; short muted banner |
| OCR fallback | Always label sample/demo equations |
| Error | Fallback explanation + “Offline notes” |

## Anti-patterns

- Purple gradients, cream+terracotta editorial, broadsheet newspaper layouts
- Dark mode by default
- Pill clusters and stat strips competing with the desk
- Detached badges floating on vessel liquid
- Three-column squeeze on phone
- Visible scrollbars in the lab
- Full gamification HUD on phone first open

## IFRA screening (Phase B)

Formula Inspector and live preview run a **teaching** IFRA Standards–aligned screen (default Category 4 fine fragrance) against Chem Lab’s version-pinned seed (`49th-Amendment-teaching`).

| UI | Behavior |
|----|----------|
| Pass | Ink “IFRA screen: Pass · Screened” + per-oil actual% / max% |
| Fail | Hazard-tint status; warnings also land in the hazards list |
| Unknown | Muted — material not in seed or solvents only |
| Disclaimer | Always visible: educational aid, not certified compliance |

## Atelier Market & panel studies (Phase B)

Market keeps the atelier language (Cormorant / DM Sans, lab tokens) — frosted panels, bottle silhouettes, no dashboard chrome.

## 3D fluid (vessel well)

WebGL liquid sits **inside** the glass well under the SVG rim. Spectacle is secondary to the glass silhouette. Fallback to SVG when WebGL fails, `prefers-reduced-motion`, or `force2d`.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-22 | Instrument-panel density on desktop | Desk stays dominant |
| 2026-07-23 | Perfume via Atelier, not legacy cologne goal | Bottle selection before commit |
| 2026-07-24 | Phone desk-only + sheets; desktop unchanged | Mobile minimal without rewriting desktop |
| 2026-07-24 | Hide scrollbars in `.lab-app` | Clean phone chrome |
| 2026-08-10 | Perfume Builder IDE: Lab\|Tutor\|Chat; Plan→Build | Desk stays hero; no silent pours; Chat absorbs `/perfumer` |
