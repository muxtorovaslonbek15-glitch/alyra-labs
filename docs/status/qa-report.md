# Alyra Perfumer + Lab bridge + IDE — QA Report

**as of 2026-08-10**  
**Role:** Chem Lab QA Lead  
**Method:** Superpowers `verification-before-completion` + `systematic-debugging`; token-light suite (no Groq chat spam)  
**qa_status:** **FAIL** (deploy blocked)

### Synthesis

Local brain + bridge + IDE chrome look solid. Production Perfumer API is still **ungated** (`GET /chats` → 200 without Bearer). That alone blocks `QA_PASS` for ship. Local ZPL auth + FE Sign-in gate already work.

---

## Evidence (commands run this session)

| Gate | Command / check | Result |
|------|-----------------|--------|
| Golden eval (no paid Groq) | `cd ZPL_BACKEND && npm run perfumer:eval` | **ALL PASS** (10/10) |
| Vitest | `npm test` in chemistry | **103/103 PASS** (15 files) |
| Playwright | `PLAYWRIGHT_BASE_URL=http://localhost:3002 PORT=3002 npx playwright test e2e/perfumer-bridge.spec.ts e2e/smoke.spec.ts` | **10/10 PASS** |
| Local auth negatives | `localhost:3001/api/perfumer` no/bad token | **401** `auth_required` / `auth_invalid` |
| Prod auth probe | `zorastrianpremierleague.in/api/perfumer/chats` no token | **200** with chat list — **not gated** |
| Groq chat smoke | Intentionally **not** run (token budget) | N/A |

**Local servers used:** chemistry `:3002`, ZPL `:3001`. Do **not** assume `:3000` is Alyra — another app was bound there during QA.

---

## PASS / FAIL checklist

| Area | Status | Notes |
|------|--------|-------|
| **Perfumer chat UI** | **PASS** | `/perfumer` shell loads; guest composer shows “Sign in to brief…”; welcome copy mentions Plan→Build. No Send/completions exercised. |
| **Open in Lab** | **PASS** | Default `?bridge=1` → **Plan ready** (not silent pour). `?bridge=1&instant=1` → desk hydrate toast. Vitest bridge mapping/round-trip green. |
| **Continue in Perfumer** | **PASS** | Deep-link `/perfumer?fromLab=1` + `alyra.chatBridge.v1` ingests Lab blend (Hedione / Iso E visible). In-shell “Continue in Perfumer” / Chat-tab send path exists (IDE-evolved; not separately e2e’d beyond deep-link). |
| **Refine diff** | **PASS** | Golden eval: harsh / less-sweet / projection / longevity assert `formulaDiff.changes`. FormulaCard `DiffView` present in code. |
| **Catalog-first** | **PASS** | Eval Alyra lineup + offline catalog language; no invented house SKUs. |
| **Auth gate** | **FAIL** (prod) / **PASS** (local) | Local middleware + FE `getAuthHeaders` + guest Sign-in CTA. **Prod still public.** Re-test prod 401 after ZPL deploy. |
| **IDE Plan/Build** | **PASS** (present) | Lab \| Tutor \| Chat tabs; Plan panel + Build CTA after bridge; phone chat affordance; `BuildQueue` Vitest. Desktop rails via `DesktopBuilderChrome`. Not a full signed-in Build pour e2e (would mutate desk; skipped to stay token-light). |

---

## Browse (token-light)

- **URL:** `http://localhost:3002/perfumer`, `/lab`, `/lab?bridge=1`
- **Flows:** shell render; Plan-ready bridge; instant hydrate; fromLab ingest; Lab/Tutor/Chat open Chat rail — **no** message Send
- **Console:** Transient `setTab is not defined` seen once during IDE HMR mid-edit; **not** reproduced after server restart. Watch for recurrence.

---

## Automated

- **Vitest:** 103 passed (includes `labBridge`, `BuildQueue`, chemistry engine)
- **Playwright:** smoke + `e2e/perfumer-bridge.spec.ts` — 10 passed
- **perfumer:eval:** ALL PASS

---

## Fixes applied this QA pass (small / test-facing)

1. **`playwright.config.ts`** — honor `PORT` / `PLAYWRIGHT_BASE_URL` so QA does not hit a foreign app on `:3000`.
2. **`vitest.config.mts`** — replace broken CJS `vitest.config.ts` (`ERR_REQUIRE_ESM` with Vite 8 / std-env).
3. **`e2e/perfumer-bridge.spec.ts`** — new no-Groq bridge + IDE coverage; Plan-first + instant paths.
4. **`e2e/smoke.spec.ts`** — Lab/Tutor/Chat chrome (Desk mode toggle label is “Scan” when on desk).
5. **`labBridge.test.ts`** — schema shape, Solid beeswax, formulaDiff payload asserts.

Did **not** fight IDE agent on Plan/Build product files beyond aligning tests to Plan-first behavior.

---

## Issues / blockers

1. **P0 — Prod auth not deployed.** Ungated `/chats` (and likely `/chat`) burns Groq for anyone. Local already returns 401.
2. **P1 — Playwright default port.** Without `PORT=3002`, `reuseExistingServer` can attach to the wrong Next app on `:3000`.
3. **P2 — Signed-in Build pour e2e** still missing (needs Firebase test user or `__chemlab.unlockLab` path).
4. **P2 — Continue-in-shell** button path should get a dedicated Playwright case once IDE stabilizes.

---

## Decision

**qa_status: FAIL** — do not deploy / do not treat soft-launch as ready until:

1. Production Perfumer routes return **401** without Bearer (and `auth_invalid` on junk JWT).
2. Re-run auth negatives against prod + one signed-in health/chat list check.
3. Optional: one unlocked Build pour Playwright case.

Local feature development may continue; **pipeline gate for Deployment remains closed.**

---

## Signed

QA Lead — Chem Lab (`chemlab-qa-lead`) · 2026-08-10  
No commit / deploy / ntfy from this session.

---

## Release Captain override (prod auth re-probe)

**as of 2026-08-10** · after ZPL `1ac9db2` on DO + `FIREBASE_PROJECT_ID=chem-lab-neil`

| Probe | Result |
|-------|--------|
| `GET /api/perfumer/chats` no auth | **401** `auth_required` |
| `POST /api/perfumer/chat` no auth | **401** `auth_required` |
| `GET /api/perfumer/health` | **200** slim (`authRequired: true`, `authDisabled: false`) |

**Ship gate for auth:** **PASS**. Prior FAIL was pre-deploy (stale).

