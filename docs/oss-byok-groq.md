# Open-source BYOK — Groq API keys

Alyra Master Perfumer does **not** ship a shared Groq key. Each signed-in user adds their own free key.

## User flow

1. Sign in (Firebase).
2. Illustrated onboarding modal (`GroqKeyOnboarding`) walks through Groq Console with screenshots:
   - `public/onboarding/groq/01-console.jpg` — sign in / console
   - `public/onboarding/groq/02-api-keys.jpg` — API Keys nav
   - `public/onboarding/groq/03-create-key.jpg` — create dialog
   - `public/onboarding/groq/04-copy-key.jpg` — copy `gsk_…`
   - `public/onboarding/groq/05-paste-in-app.jpg` — paste in app
   - `public/onboarding/groq/06-delete-rotate.jpg` — settings delete (rate-limit rotate)
3. Key is sent once over HTTPS (`PUT /api/perfumer/keys/groq`), held in memory only during submit, then encrypted server-side.
4. Chat / Settings → **API key** to view hint (`••••xxxx`), replace, or delete.
5. On `rate_limited`, ErrorBanner CTA **Rotate Groq key** reuses the screenshot stepper (delete → new Groq key → paste).

Images are **illustrative mockups** of the console path; live Groq UI may differ slightly. Captions in the UI say so.

## Backend (ZPL `alyra-perfumer`)

| Env | Purpose |
|-----|---------|
| `PERFUMER_BYOK_SECRET` | AES-256-GCM key material (required to store user keys) |
| `PERFUMER_REQUIRE_USER_GROQ=1` | Never fall back to server `GROQ_API_KEY` (OSS production) |
| `PERFUMER_BYOK_VERIFY` | `1` = light Groq models ping on save |

See `alyra-perfumer/README.md` in ZPL_BACKEND for routes and storage details.

## Honesty / follow-ups

- v1 encryption is app-level AES-GCM with a server secret — **not** cloud KMS. Protect `PERFUMER_BYOK_SECRET` like any production secret.
- Server `GROQ_API_KEY` remains useful for local operator demos when `PERFUMER_REQUIRE_USER_GROQ` is off.
- Never paste user keys into Obsidian, chat logs, or git.
