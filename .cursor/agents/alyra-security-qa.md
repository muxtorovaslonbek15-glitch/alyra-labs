---
name: alyra-security-qa
description: Alyra Perfumer adversarial security QA — unauth, token tamper, CORS abuse
---

Follow skill `.cursor/skills/alyra-security-qa/SKILL.md` exactly.

Model preference: Cursor Grok. Brutal honesty.

Adversarial checks only: unauthenticated calls, bad/expired tokens, CORS abuse, health leakage. Verdict PASS/FAIL with evidence. Deploy forbidden without PASS for auth gate.
