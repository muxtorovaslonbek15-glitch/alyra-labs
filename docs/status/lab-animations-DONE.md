# Lab animations polish — DONE

**Date:** 2026-08-10  
**Track:** Parallel to solid tin desk UX  
**Status:** IN_DEV complete (code) · deploy deferred — no vault `qa_status: PASS` for this slice

## What shipped (product repo)

Shared motion utilities + chrome polish so the Lab feels alive without purple AI glow spam (`DESIGN.md`).

| Surface | Change |
|---------|--------|
| **BuildQueue pours** | Step delays keyed by kind; liquid pours wait ~`POUR_WINDOW_MS`; solid quieter fill + melt/cast narration; Solid→`tin` when equipment exists |
| **Panel dock right↔bottom** | Soft out→in fade via `useDeferredSwap` in `LabShell` |
| **Chat history desk toggle** | Soft crossfade (`usePresence` + `lab-crossfade-*`) |
| **Plan → Build CTA** | Ready breathe (ink ring), press scale, build progress bar |
| **Empty desk / cheat sheet** | Staggered rise + subtle presence pulse; copy coordinated with solid tin bias |
| **`prefers-reduced-motion`** | All new chrome animations disabled / hard-cut; BuildQueue uses 40ms steps |

## Files (animation track — avoid vessel thrash)

- `src/animation/motion.ts` — shared timing, solid/tin equipment resolve, sleep
- `src/animation/usePresence.ts` — crossfade + deferred dock swap hooks
- `src/animation/motion.test.ts`
- `src/perfumer/BuildQueue.ts` + `BuildQueue.test.ts`
- `src/perfumer/PlanPanel.tsx`, `ChatHistoryCanvas.tsx`
- `src/desk/LabShell.tsx`, `DeskWorkspace.tsx` (empty presence classes only)
- `src/app/globals.css` — chrome keyframes + reduced-motion

**Left to solid agent:** `VesselSlot` / tin silhouette / melt→set reveal spectacle. BuildQueue only attaches heat/cool and prefers `tin` equipment id.

## Tests

```bash
npx vitest run src/perfumer/BuildQueue.test.ts src/animation/motion.test.ts
```

Passed (2026-08-10).

## Deploy / ntfy

- **Deploy:** not run from this track — pipeline requires QA PASS; coordinate ship with or after solid tin work.
- **ntfy:** optional after joint deploy.

## Coord note for solid track

`resolveBuildEquipmentId` returns `tin` for `format: "Solid"` when `EQUIPMENT_BY_ID.tin` exists. Narration uses melt / blend / cast language. Do not re-time liquid pours in vessel FX without updating `buildStepDelayMs` / `POUR_WINDOW_MS` coupling.
