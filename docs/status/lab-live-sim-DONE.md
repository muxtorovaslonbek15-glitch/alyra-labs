# DONE — Lab live heat / cool / evaporate / stir sim

**as of 2026-08-10**  
**Scope:** `/Users/neil/Desktop/chemistry` (FE). Solid tin silhouette / cast reveal preserved.

## Shipped

| Behavior | Implementation |
|----------|----------------|
| **Cool → freeze** | Gradual warm→cool→slush→ice via cool elapsed + frost; abort keeps partial frost |
| **Heat → evaporate** | Amount reduces by species volatility (ethanol ≫ water ≫ oils); wax/tin **melt**, no water-like evaporate |
| **Stir / Shake / Mix** | Continuous toggles; FX pulsed while on; agitation eases out when shut off |
| **Timers** | `VesselSimHud` on vessel + desk shows phase · elapsed · intensity (+ melt/frost/evap chips) |
| **Always-alive** | `DeskSimTicker` (~500ms) + `useFxClock(forceAlive)` while heat/cool/agitation engaged |
| **prefers-reduced-motion** | Slower ticks / simpler motion; numeric HUD + amount changes still apply |

## Key files

- `src/desk/vesselSim.ts` — pure tick (material profile, phases, evaporate, agitation)
- `src/desk/vesselSim.test.ts`
- `src/store/deskStore.ts` — `tickSims`, `toggleStirActive` / `toggleShakeActive` / `toggleMixActive`
- `src/desk/DeskSimTicker.tsx` — mounted in `LabShell`
- `src/desk/VesselSimHud.tsx`, `DeskWorkspace.tsx`, `VesselSlot.tsx`
- `src/animation/fxIntensity.ts` — sim frost / melt / continuous stir
- `src/animation/glassware/GlassVessel.tsx` + `livePreviewToFluidState.ts` — fluid coupling
- `src/animation/glassware/SolidTinVessel.tsx` — `meltFraction` gradual melt/set (cast reveal intact)
- Prior chrome polish: `docs/status/lab-animations-DONE.md`

## Tests

```bash
npx vitest run src/desk/vesselSim.test.ts src/animation/fxIntensity.test.ts
npx tsc --noEmit
```

Passed (2026-08-10). Local `GET /lab` → 200. Prod `/lab` → 200.

## Smoke

1. Beaker + water → Cool → HUD Cooling→Slush→Ice (not instant).
2. Beaker + ethanol vs water → Heat → ethanol volume drops faster; HUD “evap”.
3. Stir toggle stays pressed; swirl continues; ease-out when off.
4. Tin + beeswax → Melt raises melt % (no evaporate); Set returns matte; Cast reveal intact.

## Deploy / ntfy

- **Production:** https://alyra-labs.vercel.app  
- **Deployment:** https://alyra-labs-n23abxz7z-neilcarnacs-projects.vercel.app  
- **Inspect:** https://vercel.com/neilcarnacs-projects/chemistry/4uaQeShTMpyhnaRfPmNR79Y6BUk7  
- ntfy → chemistry (posted 2026-08-10)
