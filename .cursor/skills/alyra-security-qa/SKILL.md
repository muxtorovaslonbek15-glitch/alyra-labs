---
name: alyra-security-qa
description: >-
  Adversarial security QA for Alyra Perfumer API auth gate — unauth, tamper, CORS.
---

# alyra-security-qa

## Stance

Cursor Grok. Fail closed. Evidence = HTTP status + body shape (no tokens in logs).

## Cases (minimum)

1. No `Authorization` → 401 on `/chat`, `/chat/stream`, `/search`, `/chats`, `/formula/generate`
2. Garbage Bearer → 401
3. `/health` still 200 with minimal fields (no key-pool dump)
4. Valid token (if available in session) → not 401
5. CORS preflight does not bypass auth on POST

## Verdict

`PASS` | `FAIL` with blockers. Deploy forbidden on FAIL.
