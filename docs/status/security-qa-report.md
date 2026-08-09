# Alyra Perfumer — Adversarial Security QA

**as of:** 2026-08-10 · agent `alyra-security-qa`  
**Targets:** `http://localhost:3001/api/perfumer` · `https://www.zorastrianpremierleague.in/api/perfumer`  
**Scope:** unauth, forged Bearer, health leakage, CORS vs auth. **No** successful authenticated chat spam (avoid Groq burn).

## Verdict

| Surface | Verdict | Notes |
|---------|---------|-------|
| **Local (post-fix)** | **PASS** | Gate returns 401; health slim; CORS does not bypass auth |
| **Production (live)** | **FAIL** | Auth middleware **not deployed**; open Groq / chats / formula |
| **Deploy gate** | **FAIL** | Do **not** treat prod as sealed until backend ship + re-QA |

Overall: **FAIL** for production. Local fix is in ZPL working tree only (no commit/deploy from this agent).

## Pre-fix evidence (critical)

`lib/firebaseAuth.js` (`requirePerfumerUser`) existed but was **not mounted** on the Express router. All cost-bearing routes were public.

| Case | Target | Result |
|------|--------|--------|
| No `Authorization` → `POST /chat` | **PROD** | **200** + Groq reply (`ok:true`, usage tokens) — **Groq burned** |
| No `Authorization` → `GET /chats` | PROD + LOCAL | **200** — full chat list (IDOR / store dump) |
| No `Authorization` → `POST /formula/generate` | PROD + LOCAL | **200** |
| `GET /health` | PROD + LOCAL | **200** with **verbose** leak: `groqKeys`, cache, catalog counts, chat counts |

One unauthenticated prod `/chat` probe executed before the hole was confirmed; no further authenticated or successful chat spam after that.

## Fix applied (ZPL `alyra-perfumer`, local only)

1. Mounted `router.use(requirePerfumerUser)` after slim `GET /health` in `alyra-perfumer/index.js`.
2. Added `auth_required` / `auth_invalid` / `auth_misconfigured` to `lib/errors.js` (401 / 401 / 503).
3. Slimmed public `/health` (`ok`, `service`, `groqConfigured`, `authConfigured`, `authDisabled`); verbose only if `PERFUMER_HEALTH_VERBOSE=1`.
4. Rate limit key prefers `uid:` when `req.perfumerUser` is set.
5. Local `.env`: set public `FIREBASE_PROJECT_ID=chem-lab-neil` so JWKS verify works (forged → `auth_invalid`, not `auth_misconfigured`).

**Not done by this agent:** commit, deploy, ntfy.

## Post-fix local matrix

Base: `http://localhost:3001/api/perfumer`

| Case | Status | Body shape |
|------|--------|------------|
| `GET /health` (no auth) | **200** | `{ ok, service, groqConfigured, authConfigured, authDisabled }` — no key-pool dump |
| `GET /chats` (no auth) | **401** | `auth_required` |
| `GET /template` (no auth) | **401** | `auth_required` |
| `POST /chat` (no auth) | **401** | `auth_required` |
| `POST /chat/stream` (no auth) | **401** | `auth_required` |
| `POST /search` (no auth) | **401** | `auth_required` |
| `POST /formula/generate` (no auth) | **401** | `auth_required` |
| `POST /chat` forged Bearer | **401** | `auth_invalid` |
| `POST /search` forged Bearer | **401** | `auth_invalid` |
| `POST /formula/generate` forged Bearer | **401** | `auth_invalid` |
| `OPTIONS /chat` (evil Origin) | **204** | Reflects CORS headers |
| `POST /chat` after OPTIONS, no auth | **401** | CORS preflight does **not** bypass auth |

Valid-token happy path: **not exercised** (would risk Groq). FE already wires `getAuthHeaders()` in `src/perfumer/api.ts`.

## Production still open (post-local-fix)

| Case | Status |
|------|--------|
| `GET /health` | **200** verbose (old binary) |
| `GET /chats` no auth | **200** |
| `POST /formula/generate` no auth | **200** |
| `POST /formula/generate` forged Bearer | **200** (token ignored) |

## Remaining blockers before PASS for deploy

1. **Deploy** fixed `alyra-perfumer` to ZPL prod with `FIREBASE_PROJECT_ID` (or Admin creds) set on the host.
2. Re-run this adversarial matrix against prod (still avoid authenticated chat spam).
3. Confirm FE Bearer path against gated prod (one signed-in non-chat call, e.g. `/template` or `/chats`, is enough).
4. Follow-up (non-blocking for auth gate): uid-scoped chat store (global list still IDOR once authenticated).

## Groq burn note

During pre-fix prod probe, one unauthenticated `POST /chat` returned 200 and consumed tokens. Subsequent probes used non-LLM routes or expected 401 only.
