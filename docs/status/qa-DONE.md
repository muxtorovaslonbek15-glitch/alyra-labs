# QA DONE — Alyra Perfumer + Lab bridge + IDE

**as of 2026-08-10**  
**Agent:** chemlab-qa-lead  
**Report:** [`docs/status/qa-report.md`](./qa-report.md)

## Verdict

**qa_status: FAIL** (production auth ungated). Local eval + Vitest + Playwright green.

## Done

- [x] Superpowers verification stance applied (evidence before claims)
- [x] `npm run perfumer:eval` → ALL PASS (ZPL_BACKEND, no paid Groq)
- [x] Vitest 103/103 (config fixed to `vitest.config.mts`)
- [x] Playwright smoke + `e2e/perfumer-bridge.spec.ts` → 10/10 on `:3002`
- [x] Auth negatives: local 401 PASS; prod still 200 FAIL
- [x] Checklist written for chat UI, Open in Lab, Continue in Perfumer, refine diff, catalog-first, auth, IDE Plan/Build
- [x] Small fixes only (Playwright port, Vitest ESM, e2e/smoke alignment) — no deploy/ntfy/commit

## Not done (by design)

- Groq live chat spam
- Prod deploy / ntfy
- Git commit

## Release Captain note (post-deploy)

Prod auth re-probed **PASS** (`chats`/`chat` → 401). Ship gate unblocked for ntfy. Local QA evidence above remains valid.

