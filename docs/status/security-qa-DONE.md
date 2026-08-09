# Alyra Perfumer — Security QA DONE

**Finished:** 2026-08-10  
**Agent:** `alyra-security-qa`  
**Report:** [`security-qa-report.md`](./security-qa-report.md)

## Summary

- Adversarial QA run against local + prod `/api/perfumer`.
- **Prod FAIL:** auth middleware was missing in the live binary; unauth `/chat` returned 200 (Groq burn); chats/formula open.
- **Critical fix (local ZPL only):** wired `requirePerfumerUser`, 401 catalog, slim `/health`, uid rate-limit key; local matrix now **PASS**.
- **No** commit / deploy / ntfy from this agent.
- Deploy gate remains **FAIL** until prod ships the gate and is re-probed.
