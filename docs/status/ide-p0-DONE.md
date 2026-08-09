# IDE P0 — DONE

**Date:** 2026-08-10  
**Scope:** Perfume Builder IDE P0 (`docs/alyra-perfume-builder-ide-plan.md`)  
**Repos:** Development complete — **not** committed / pushed / deployed / ntfy (Release Captain owns that)

---

## What shipped

### Shell
- **Lab | Tutor | Chat** tabs in Lab header (Scan remains a quiet toggle)
- **Closable left inventory + right rail** on `md+` (prefs: `alyra.builder.panels.v1`)
- **Right slot:** Tutor ↔ Chat mutually exclusive (not 4 columns)
- **Phone:** desk-only preserved; Chat/Plan via sheet (`MobileBuilderChrome` + `LabSheet`); Chat FAB on inventory rail; Build collapses sheet to slim progress chip

### Plan → Build
- Plan mode default: bridge / formula → **Plan panel**, no silent pours
- **Build** CTA runs `BuildQueue` (timed place → pour → set amount → stir → mix + chat narration)
- **Stop** aborts queue; **Undo to plan** restores one-level desk snapshot
- **Apply instantly** = power-user bulk `loadFormula` (legacy Open-in-Lab behavior)
- Guest rule: Build counts as **one** guest action (same as `loadFormula`)

### Absorb Perfumer
- Chat embedded in Lab right rail (`ChatRail` / `PerfumerChat variant="shell"`)
- `/perfumer` redirects to `/lab?tab=chat`
- Nav **Chat** → `/lab?tab=chat`
- Lab↔Chat bridge preserved (`LabBridgeFormula`, Send desk to Chat, `?bridge=1` → plan_ready)

### Analytics
- `builder_plan_ready`, `builder_build_start`, `builder_build_complete`, `builder_stop`

### Tests
- Vitest: `src/perfumer/BuildQueue.test.ts` (step derivation + unmapped honesty)
- Existing `labBridge.test.ts` still green

### Files (primary)
| Path | Role |
|------|------|
| `src/desk/LabShell.tsx` | Tabs, panels, bridge→plan, in-shell send-to-chat |
| `src/desk/DesktopBuilderChrome.tsx` | Desktop Chat rail + Build orchestration |
| `src/desk/MobileBuilderChrome.tsx` | Phone sheets + Build progress |
| `src/perfumer/BuildQueue.ts` | Step derivation + timed desk mutations |
| `src/perfumer/PlanPanel.tsx` | Readable plan + Build/Stop/Undo |
| `src/perfumer/ChatRail.tsx` | Chat + Plan stack |
| `src/perfumer/deskSnapshot.ts` | One-level Undo |
| `src/store/builderStore.ts` | Mode, panels, narration, plan artifact |
| `src/app/perfumer/page.tsx` | Redirect into Lab Chat |
| `src/lib/analytics/events.ts` | Builder events |

**Backend:** unchanged (client-enforced Plan/Build; no Groq / ZPL changes for P0)

---

## How to verify

1. `cd /Users/neil/Desktop/chemistry && npm run dev` (or existing local server)
2. **Desktop (`md+`):**
   - Open `/lab` → tabs Lab | Tutor | Chat; collapse left/right grips; prefs survive refresh
   - Chat tab → Perfumer chat in right rail; brief locally if signed in (or use a stored chat with a formula)
   - With a formula in Plan → **Build** → sequential pours + narration lines; **Stop** / **Undo to plan**
   - Desk with fragrance materials → **Send desk to Chat** stays on `/lab` (no `/perfumer` hop)
3. **Phone (`< md`):**
   - No 3-column layout; Chat FAB opens sheet; Build collapses to progress chip over desk
   - Tutor sheet and Chat sheet don’t stack (mutually exclusive)
4. **Deep links:**
   - `/perfumer` → `/lab?tab=chat`
   - `/lab?bridge=1` with sessionStorage bridge → Plan ready (not silent pour); `?instant=1` for bulk hydrate
5. **Tests:** `npx vitest run src/perfumer/BuildQueue.test.ts src/perfumer/labBridge.test.ts`
6. **Typecheck:** `npx tsc --noEmit`

---

## Explicit non-goals left for P1+

- `orchestrationMode` in API / system prompt
- Resume after Stop; richer desk timeline HUD
- Keyboard shortcuts (⌘B / ⌘\\)
- Playwright e2e brief → Build → vessel assert
- Expanding Lab inventory map hit-rate
