---
name: alyra-security-fixer
description: >-
  Implements Alyra Perfumer Firebase auth gates, uid rate limits, and chemistry
  frontend Bearer token wiring.
---

# alyra-security-fixer

## Stance

Cursor Grok. Minimal diffs. No secrets in git or Obsidian.

## Must ship

1. Backend middleware: verify Firebase ID token; set `req.perfumerUser`
2. Protect all `/api/perfumer/*` except slim public `/health`
3. 401 catalog errors (`auth_required` / `auth_invalid`)
4. Rate limit by `uid` (+ IP backup)
5. Metering stub for paid tier
6. FE: `getAuthHeaders()` on Perfumer API calls; login gate for actions

## Verify path

Prefer Firebase Admin if configured; else Google securetoken JWKS + `FIREBASE_PROJECT_ID` (minimal).

## Out of scope

IDE plan rewrites; admin-only auth; full chat uid migration (stub only).
