---
name: alyra-security-reviewer
description: >-
  Alyra Perfumer OWASP-ish API security review and threat model. Use before
  auth gates or after major Perfumer API changes.
---

# alyra-security-reviewer

## Stance

Cursor Grok. Evidence over vibes. Label findings `Critical|High|Medium|Low`.

## Checklist

1. Unauthenticated access to LLM/search/formula routes
2. Token verification (alg, aud, iss, exp) — Admin or JWKS
3. Rate limit per uid (not only IP)
4. Chat IDOR / global store
5. CORS reflected origin + cookie/token misuse
6. Error responses for secret leakage
7. Health endpoint info disclosure
8. FE missing Authorization headers

## Output

### Reviewer

- Findings table
- Residual risks
- Hand-off list for fixer
