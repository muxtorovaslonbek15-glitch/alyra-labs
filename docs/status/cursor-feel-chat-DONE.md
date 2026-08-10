# Cursor-feel Perfumer chat — DONE

**Date:** 2026-08-10  
**Surface:** Lab Chat (`PerfumerChat`) + Plan/Build toast hits  
**Lab URL:** https://alyra-labs.vercel.app/lab?tab=chat

## What shipped

FE interprets existing SSE `status` / `tool` / `structured` / `lab_bridge` events into a Cursor-style work timeline. No extra Groq calls for “thinking.”

1. **Working… timer** — live seconds while streaming; **Worked for Xs** with check when done  
2. **Thought briefly** — expandable rows (collapsed by default); notes from status labels  
3. **Tool chips** — `formula` · `catalog` · `refine` (and peers) under the finished timeline  
4. **Build steps** — desk narration as calm `build` chips in the chat scroll  
5. **Achievements** (toast, not CTA spam): Plan ready, Build complete, Solid tin cast, Refine done, First formula, On the desk  

## Key files

- `src/perfumer/thoughtTimeline.ts` (+ vitest)  
- `src/perfumer/AgentTimeline.tsx`  
- `src/perfumer/chatAchievements.ts`  
- `src/perfumer/PerfumerChat.tsx`  
- `src/desk/useBuilderBuildActions.ts`  
- `src/perfumer/FormulaCard.tsx`  

## BE

No ZPL stream-schema change required. Existing events are enough.

## Smoke

- [x] Local `/lab?tab=chat`: injected timeline → **Worked for 6s**, expandable **Thought briefly** (Listening / Composing), `formula` chip  
- [x] Vitest `thoughtTimeline.test.ts` pass; `tsc --noEmit` clean  
- [x] Prod alias `https://alyra-labs.vercel.app/lab?tab=chat` HTTP 200 after deploy  
- [ ] Live signed-in stream (auth gate in browser smoke; SSE path unchanged)

## Deploy

- Vercel prod: `alyra-labs.vercel.app` (dpl_BPJBqnEk6C1ze2wfc9NPxcj1rnyS)  
- Ntfy: `Alyra chat feel live` → https://ntfy.sh/chemistry
