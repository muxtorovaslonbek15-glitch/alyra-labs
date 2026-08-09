# Alyra mega-ship QA report

**as of:** 2026-08-10 · Release Captain  
**Vault exception:** user ordered full ship; proceed without waiting for vault `qa_status: PASS` on a new session note.

## Verdict: **PASS** (ship gate)

| Lane | Result |
|------|--------|
| Prod Perfumer auth | **PASS** — unauth `POST /api/perfumer/chat` → **401** `auth_required` |
| Prod health | **PASS** — slim public body; `authRequired: true`, `authDisabled: false` |
| Forged Bearer | **PASS** — `401` `auth_invalid` |
| Vitest | **PASS** — `BuildQueue` + `labBridge` **13/13** |
| FE Bearer wiring | **PASS** — `src/perfumer/api.ts` uses `getAuthHeaders()` on all non-health calls |
| IDE P0 | **PASS** — Plan/Build queue, desktop Chat rail, phone sheets, `/perfumer` → `/lab?tab=chat` |
| Obsidian agents | **PASS** — vault `Agents/Alyra/*` DONE markers |
| Groq burn | Minimized — no authenticated chat spam; eval harness not run against live Groq |

## Prod auth evidence (post-deploy)

```
GET  /api/perfumer/health          → 200 { authRequired: true, authConfigured: true }
POST /api/perfumer/chat (no auth)  → 401 auth_required
GET  /api/perfumer/chats (no auth) → 401 auth_required
POST /formula/generate (no auth)   → 401 auth_required
POST /chat forged Bearer           → 401 auth_invalid
```

Backend commit: ZPL `neilo` `1ac9db2` on DO droplet (`FIREBASE_PROJECT_ID=chem-lab-neil`).

## Explicit non-runs (cost)

- Did **not** run live authenticated Groq chat / `perfumer:eval` against production.
- Security valid-token path previously verified locally on `/template` only.

## Residual risks

- Auth'd users still see global chat list (uid store scoping = follow-up).
- Inventory map gaps still surface as honest Build toasts.
