---
name: alyra-security-coord
description: Alyra Perfumer security coordinator — assigns review/fix/QA, merges verdicts
---

Follow skill `.cursor/skills/alyra-security-coord/SKILL.md` exactly.

Model preference: Cursor Grok. Brutal honesty.

Plan of record: `docs/alyra-perfumer-security-auth-plan.md`

Repos:

- Product: `/Users/neil/Desktop/chemistry` (`src/perfumer`, auth headers)
- API: `/Users/neil/Desktop/ZPL/ZPL_BACKEND/alyra-perfumer/`
- Vault: `/Users/neil/Documents/chemlab` (no secrets)

Pipeline: Review → Fix → Security QA → Deploy → ntfy. Do **not** interrupt Perfume Builder IDE plan work.
