# Security auth DONE — Alyra Perfumer

**as of 2026-08-10** · Workstream complete for Development + Security QA.  
**Deploy / ntfy: Release Captain only** (not done here).

## Verdict

| Lane | Result |
|------|--------|
| Local Security QA | **PASS** (9/9) |
| FE token wiring | **Done** |
| BE `requirePerfumerUser` mounted | **Done** (`router.use` after slim `/health`) |
| Prod live gate | **Not shipped yet** — still open until Captain deploys |

## Auth design (normal user, not admin)

1. Browser: Firebase Auth → `getIdToken()` → `Authorization: Bearer <idToken>`
2. ZPL `alyra-perfumer`: verify via Firebase Admin **or** Google securetoken x509 + `FIREBASE_PROJECT_ID=chem-lab-neil`
3. Missing/invalid → **401** `auth_required` / `auth_invalid` (catalog errors, no secret leak)
4. Rate limit per `uid` (+ IP fallback); metering stub for paid tier

## What was gated

| Route | Auth |
|-------|------|
| `GET /api/perfumer/health` | **Public**, slim (`ok`, `service`, `groqConfigured`, `authConfigured`, `authDisabled`, `authRequired`) — no `groqKeys` unless `PERFUMER_HEALTH_VERBOSE=1` |
| All other `/api/perfumer/*` | **Required** — chat, chat/stream, chats CRUD, template, ingredients, formula/*, solid/*, dupe, search |

## Code touchpoints

### Backend (ZPL)

- `alyra-perfumer/lib/firebaseAuth.js` — verify + `requirePerfumerUser`
- `alyra-perfumer/index.js` — `router.use(requirePerfumerUser)` after `/health`
- `alyra-perfumer/lib/errors.js` — `auth_required` / `auth_invalid` / `auth_misconfigured`
- `alyra-perfumer/scripts/security-auth-qa.cjs` — adversarial suite
- `.env.example` — `FIREBASE_PROJECT_ID`, `PERFUMER_AUTH_DISABLED`, `PERFUMER_HEALTH_VERBOSE`

### Frontend (chemistry)

- `src/perfumer/api.ts` — `getAuthHeaders()` on every call except `/health`
- `src/perfumer/PerfumerChat.tsx` — Sign-in gate before send; server chat list only when signed in
- Agents: `.cursor/agents/alyra-security-*.md` (+ skills)
- Plan: `docs/alyra-perfumer-security-auth-plan.md`

## Local QA evidence (2026-08-10)

```
PASS  GET /health public + slim
PASS  POST /chat, /chat/stream, /formula/generate, /search → 401 unauth
PASS  GET /chats, /template → 401 unauth
PASS  Garbage Bearer → 401 auth_invalid
PASS  Valid Firebase ID token GET /template → 200
Total 9  PASS 9  FAIL 0
```

Valid-token probe used `/template` only (no Groq).

## Prod status (pre-Captain)

Checked live `https://www.zorastrianpremierleague.in/api/perfumer`:

- Unauthenticated `POST /chat` still **200** (gate not deployed)
- `/health` still verbose (old build)

### After Release Captain ships (expected)

With droplet env `FIREBASE_PROJECT_ID=chem-lab-neil` (and `PERFUMER_AUTH_DISABLED` unset/0):

| Call | Expected |
|------|----------|
| `POST /api/perfumer/chat` no Authorization | **401** `auth_required` |
| `POST /api/perfumer/chat/stream` no Authorization | **401** |
| `GET /api/perfumer/chats` no Authorization | **401** |
| Garbage Bearer | **401** `auth_invalid` |
| Valid Chem Lab / Alyra Labs user ID token | **200** (non-LLM or chat) |
| `GET /health` | **200** slim + `authRequired: true` |

Captain must also ship chemistry FE so signed-in users send Bearer tokens; otherwise UI will see 401 until FE deploy.

## Captain checklist (handoff)

1. Deploy ZPL `alyra-perfumer` with mounted middleware
2. Set `FIREBASE_PROJECT_ID=chem-lab-neil` on droplet (JWKS path; Admin JSON optional)
3. Confirm `PERFUMER_AUTH_DISABLED` is **not** `1` in prod
4. Deploy chemistry FE (`api.ts` + PerfumerChat)
5. Re-run: unauth chat → 401; signed-in user works
6. ntfy chemistry when live

## Residual risk

- Chat store not yet uid-scoped (IDOR follow-up) — auth stops anonymous abuse; ownership hardening still open
- CORS still `origin: true` on ZPL — mitigated by Bearer auth (not cookies)
