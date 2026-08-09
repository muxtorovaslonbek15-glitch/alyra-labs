# Mobile IDE — DONE

**Date:** 2026-08-10  
**Status:** Complete (phone path). No commit / deploy / ntfy.

## Verdict

Phone Chat/Plan/Build works as sheets over full-bleed desk. Closable desktop panels cannot break `< md` desk-only rules if wired through `desktopOpen` (`md:flex` / `md:hidden` only).

## What shipped

- **`LabSheet`** — shared grabber + Done + safe-area sheet (`md:hidden`)
- **`MobileBuilderChrome`** — Chat FAB, Chat+Plan sheet (`PerfumerChat variant="shell"` + `PlanPanel`), Build progress chip, plan-ready chip
- **`useMdUp`** — Tailwind `md` breakpoint helper
- **`ItemPanel` / `ExplanationPanel`** — optional `desktopOpen` (desktop-only; phone unchanged)
- **`builderStore.beginBuilding`** — closes chat sheet so pours stay visible
- **`LabShell`** — mounts `MobileBuilderChrome` (no-ops on `md+`)

## How to verify (phone / narrow viewport)

1. Open `/lab` at `< 768px` — desk only, no side columns
2. Tap **Chat** FAB → sheet with chat; Done closes
3. After a plan exists (`variant="shell"` publish) → Plan footer shows **Build**
4. Tap **Build** → sheet collapses; progress chip + Stop; desk pours visible
5. Open Tutor (Eq) while Chat open → Chat closes (mutual exclusion)
6. Inventory Notes/+ still sheets; recipe journal still `hidden md:block`

## Coordination

See [`mobile-ide-NOTES.md`](./mobile-ide-NOTES.md) for desktop IDE wiring of `desktopOpen` + Chat rail.

## Known gaps (IDE-owned)

- Desktop Lab \| Tutor \| Chat tabs + closable rails not required for this DONE
- `PerfumerChat.tsx` may still have mid-flight TS errors from IDE shell work (`compact` / `MessageBubble` props) — unrelated to mobile mount
- Chat FAB sits above inventory FAB stack; IDE may later fold into one rail

## Files touched

- `src/desk/LabSheet.tsx` (new)
- `src/desk/useMdUp.ts` (new)
- `src/desk/MobileBuilderChrome.tsx` (new)
- `src/desk/LabShell.tsx` (mount only)
- `src/panel/ItemPanel.tsx`
- `src/explanation/ExplanationPanel.tsx`
- `src/store/builderStore.ts`
- `docs/status/mobile-ide-NOTES.md`
- `docs/status/mobile-ide-DONE.md`
