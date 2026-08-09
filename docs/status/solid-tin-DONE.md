# DONE — Solid perfume desk P0 (tin)

**as of 2026-08-10**  
**Path:** `/Users/neil/Desktop/chemistry`  
**Plan:** [`docs/alyra-solid-perfume-desk-ux-plan.md`](../alyra-solid-perfume-desk-ux-plan.md)

## Verdict

P0 ready to commit. No solid mode toggle. Solid intent auto-detects → tin vessel + Cast reveal. Release captain owns deploy / milestone ntfy.

## Shipped

| Item | Where |
|------|--------|
| Auto-detect (no toggle) | `src/perfumer/solidDetect.ts` — bridge `format` / chassis / catalog / brief |
| Solid → tin on Lab bridge | `labBridge.ts` + schema enum `tin` |
| Tin equipment | `equipment.ts` id `tin` |
| Matte tin / puck SVG | `SolidTinVessel.tsx` |
| Vessel morph on desk | `VesselSlot` renders tin when `equipmentId === "tin"` |
| Cast reveal (~1.6s) | cool → matte → snap → seat; reduced-motion hard cut; Press after |
| Melt / Set / Cast labels | `DeskWorkspace` + `vesselSim` rail when tin active; Shake hidden |
| `+ Tin` equipment | Place cluster (not a mode) |
| FormulaCard / Plan chassis | wax · oil · FO strip when solid |
| Build narration | melt → blend → cast → press (`BuildQueue`) |
| Empty desk tin-bias | after solid session (`SOLID_SESSION_KEY`) |

## Tests (local)

- `tsc --noEmit` — PASS
- Vitest: `solidDetect` · `labBridge` (Solid→tin) · `BuildQueue` (cast) — PASS

## Smoke (no Groq)

Plan / bridge with `format: "Solid"` → Build → tin on wood → Cast → matte puck reveal.

## Not in this pass

- Deploy / production ntfy (release captain)
- ZPL backend (client already morphs Solid→tin; no BE flag required)
- P1 Press · Warm · Wear aura polish / lid arc

## Commit hint (for captain)

Include at least:

- `src/perfumer/solidDetect.ts` (+ test)
- `src/animation/glassware/SolidTinVessel.tsx`
- `src/animation/motion.ts`
- `src/desk/{VesselSlot,DeskWorkspace,vesselContents,vesselSim}.ts(x)`
- `src/perfumer/{labBridge,BuildQueue,FormulaCard,PlanPanel,types}.*`
- `src/domains/chemistry/data/equipment.ts`
- `src/types.ts` / `src/store/deskStore.ts` (`castRevealAt`)
- `src/app/globals.css` (cast keyframes)
- `docs/schemas/lab-bridge-formula.schema.json`
- `docs/status/solid-tin-DONE.md`
