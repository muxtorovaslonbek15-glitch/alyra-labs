# DONE — Lab live heat / cool / evaporate / stir sim

**as of 2026-08-10**  
**Scope:** `/Users/neil/Desktop/chemistry` (FE). Solid tin silhouette / cast reveal preserved.  
**Deploy / ntfy:** deferred to Release Captain (joint ship OK).

## Shipped

| Behavior | Implementation |
|----------|----------------|
| **Cool → freeze** | Gradual water→slush→ice via `coolElapsedMs` + frost (`SLUSH_MS` / `ICE_MS`); never instant ice |
| **Heat → evaporate** | Amount reduces by species volatility (ethanol ≫ water ≫ oils); wax/tin **melt**, no water-like evaporate |
| **Stir / Shake / Mix** | Continuous toggles; FX pulsed while on; agitation eases out when shut off |
| **Timers** | `VesselSimHud` on vessel + desk shows phase · elapsed · intensity (+ melt/frost/evap chips) |
| **Always-alive** | `DeskSimTicker` (~250ms) + `useFxClock(forceAlive)` while heat/cool/agitation engaged |
| **prefers-reduced-motion** | Faster sim rates; tin hard-cuts cast reveal; chrome stays cut |

## Key files

- `src/desk/vesselSim.ts` — pure tick (material profile, phases, evaporate, agitation)
- `src/desk/vesselSim.test.ts`
- `src/store/deskStore.ts` — `tickSims`, `toggleStirActive` / `toggleShakeActive` / `toggleMixActive`
- `src/desk/DeskSimTicker.tsx` — mounted in `LabShell`
- `src/desk/VesselSimHud.tsx`, `DeskWorkspace.tsx`, `VesselSlot.tsx`
- `src/animation/fxIntensity.ts` — sim frost / melt / continuous mix
- `src/animation/glassware/SolidTinVessel.tsx` — `meltFraction` gradual melt/set (cast reveal intact)
- `src/lab/labActions.ts` — `tryToggleStir/Shake/MixActive`

## Tests

```bash
npx vitest run src/desk/vesselSim.test.ts src/animation/fxIntensity.test.ts src/animation/fluid3d/livePreviewToFluidState.test.ts src/animation/motion.test.ts
npx tsc --noEmit
```

Passed (2026-08-10).

## Smoke (manual)

1. Beaker + water → Cool → HUD shows Cooling→Slush→Ice over ~8–18s (not instant).
2. Beaker + ethanol vs water → Heat → ethanol volume drops faster; HUD “evap”.
3. Stir / Shake / Mix toggles stay pressed; swirl continues; ease-out when off; timers tick.
4. Tin + beeswax → Melt raises melt % (no evaporate); Set returns matte; Cast reveal still works.
5. `prefers-reduced-motion: reduce` — faster sim, no cast storyboard.

## Coord

- Solid tin / cast reveal: do not revert `SolidTinVessel` storyboard; live melt uses `meltFraction` only.
- Prior chrome polish (`lab-animations-DONE`) untouched for BuildQueue/dock.
- Release Captain: deploy + chemistry ntfy when QA PASS for the joint slice.
