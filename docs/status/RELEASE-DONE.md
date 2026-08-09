# RELEASE DONE — Alyra Perfumer / Lab IDE mega-ship

**as of:** 2026-08-10  
**Agent:** chemlab-release-captain  
**Vault exception:** user ordered full ship; proceeded without waiting for a new vault session `qa_status: PASS`.

## Verdict

**SHIPPED.** Prod Perfumer auth gated; IDE P0 + FE token wiring live; single ntfy sent.

## Evidence

| Gate | Result |
|------|--------|
| ZPL auth mount | `neilo` `1ac9db2` on DO (`FIREBASE_PROJECT_ID=chem-lab-neil`, `PERFUMER_AUTH_DISABLED=0`) |
| Prod `POST /api/perfumer/chat` no token | **401** `auth_required` |
| Prod `GET /api/perfumer/chats` no token | **401** `auth_required` |
| Prod `/health` | **200** slim (`authRequired: true`) |
| Chemistry | `main` `3c149dd` (+ follow-up QA evidence commit) |
| Vercel | `alyra-labs.vercel.app` Ready — `/perfumer` → Lab Chat redirect |
| Local QA (prior) | eval 10/10, Vitest 103, Playwright 10/10 (see `qa-report.md`) |
| ntfy | **ONE** message to `https://ntfy.sh/chemistry` titled "Alyra all done" |

## Live URLs

- Lab: https://alyra-labs.vercel.app/lab
- Perfumer (alias): https://alyra-labs.vercel.app/perfumer
- API health: https://www.zorastrianpremierleague.in/api/perfumer/health

## Notes

- QA Lead pre-deploy FAIL was correct at the time (ungated prod). Cleared after DO pull of auth middleware.
- No Groq chat spam in release verification.
