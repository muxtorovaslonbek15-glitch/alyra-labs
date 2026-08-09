# Alyra Perfumer — Security Auth Plan

**as of 2026-08-10** · Parallel to Perfume Builder IDE plan (do not rewrite IDE docs).

## Goal

Gate all cost-bearing Perfumer API traffic behind **normal Firebase end-user login** (Chem Lab / Alyra Labs Auth). Not admin-only. Random network callers must not burn Groq/Tavily without a valid session.

## Threat model (short)

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Unauthenticated Groq/Tavily abuse | Critical | Firebase ID token on `/api/perfumer/*` |
| Token tamper / expired session | High | Verify signature + `aud`/`iss`/`exp` |
| Chat store IDOR (global chats) | High | Auth + future uid-scoped store (stub ownership now) |
| CORS `origin: true` + public LLM | High | Auth makes reflected CORS less useful |
| Health info leak (key pool stats) | Medium | Slim public `/health` |
| Prompt injection / cost abuse | Medium | Per-uid rate limit + QA-LLM agent |
| Secret leak in 401/500 | Low | Catalog errors only; no stack/env |

## Auth design

```
Browser (chemistry)                ZPL alyra-perfumer
─────────────────                  ──────────────────
Firebase Auth session
  → getIdToken()
  → Authorization: Bearer <jwt>
                                   verify Firebase ID token
                                   (Admin SDK **or** Google JWKS + projectId)
                                   → req.perfumerUser = { uid, email? }
                                   → rate limit by uid (+ IP backup)
                                   → metering stub (paid tier later)
```

### Who may call

- Any signed-in Firebase user for project `chem-lab-neil` (same as Chem Lab product).
- **No** admin custom claim required.
- Guests: may browse marketing / lab desk; Perfumer **actions** require login (UI opens AuthGate; API returns 401).

### Public exceptions

| Route | Public? | Notes |
|-------|---------|-------|
| `GET /health` | Yes | Minimal: `ok`, `service`, maybe `groqConfigured` boolean — **no** key-pool internals |
| Everything else under `/api/perfumer/*` | **Auth required** | Including template, ingredients, chats, formula, search, chat/stream |

### Frontend

- `src/perfumer/api.ts` attaches `Authorization` via existing `getAuthHeaders()`.
- Clear 401 → “Sign in to use Master Perfumer”.
- `/perfumer` page: allow shell; block send/create until `user` present (`openAuthGate()`).

### Backend env (no secrets in docs)

Set on ZPL droplet (names only):

- `FIREBASE_PROJECT_ID` (or `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) — required for JWKS verify
- Optional: `FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_ADMIN_*` if using Admin SDK path
- `PERFUMER_RATE_LIMIT` — per-uid window (default 30/min)
- `PERFUMER_AUTH_DISABLED=1` — **dev only** escape hatch; refuse in production docs

### Paid-tier hooks (stubs)

```js
// req.perfumerUser.uid → future: check entitlement / quota ledger
function meteringStub(uid, action) { /* no-op; log intent */ }
```

## Agent team (chemistry repo)

| Agent | File | Job |
|-------|------|-----|
| Coordinator | `.cursor/agents/alyra-security-coord.md` | Assign review → fix → QA → merge verdicts |
| Reviewer | `.cursor/agents/alyra-security-reviewer.md` | Threat model, OWASP-ish API review |
| Fixer | `.cursor/agents/alyra-security-fixer.md` | Auth gates + FE token wiring |
| QA | `.cursor/agents/alyra-security-qa.md` | Unauth / tamper / CORS adversarial checks |
| QA-LLM (opt) | `.cursor/agents/alyra-security-qa-llm.md` | Prompt injection / cost-abuse |

Skills (short): `.cursor/skills/alyra-security-*/SKILL.md` for coord + reviewer.

## Pipeline

```
Review → Fix (auth gate) → Security QA → Deploy backend (+ FE if headers) → ntfy chemistry
```

Deploy only after security QA PASS for the auth gate. Independent of IDE plan agent.

## Implementation status (as of 2026-08-10)

| Piece | Status |
|-------|--------|
| Security agent team (5) + skills | Done in chemistry `.cursor/` |
| Backend `requirePerfumerUser` (JWKS + optional Admin) | Done in `alyra-perfumer/lib/firebaseAuth.js` |
| All `/api/perfumer/*` except slim `/health` gated | Done — `router.use(requirePerfumerUser)` mounted after `/health` |
| FE Bearer via `getAuthHeaders()` | Done in `src/perfumer/api.ts` |
| `/perfumer` send requires login | Done in `PerfumerChat.tsx` |
| Local Security QA | **PASS 9/9** (`alyra-perfumer/scripts/security-auth-qa.cjs`) |
| Status handoff | `docs/status/security-auth-DONE.md` |
| Deploy / ntfy | **Release Captain** — not this workstream |

**Prod today:** gate not live (unauth chat still 200). **After Captain ships + `FIREBASE_PROJECT_ID` set:** unauth → 401.

## Out of scope (this pass)

- Full chat ownership migration (uid column) — stub `req.perfumerUser.uid` on requests; store scoping is follow-up.
- Admin role gates.
- Rewriting Perfume Builder IDE plan.
- Commit / push / deploy / ntfy (Release Captain).
