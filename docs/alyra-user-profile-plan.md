# Alyra — Per-user profile plan

**as of 2026-08-10** · Plan + P0 gate removal in chemistry FE.  
Parallel to BYOK / chat / security-auth work.

Neil (viewing this plan) asked to treat as **in-scope deliverables**: full profile UI + agent injection, production ship phases, and Groq-key ↔ profile relationship (link only — see §8).

## Brutal honesty (current state)

There is already a profile system. Do **not** invent a second identity store.

| What exists | Where | Verdict |
|-------------|--------|---------|
| `UserProfile` + `users/{uid}` | Firestore (`src/lib/firebase/profile.ts`) | Real: name, phone, gender, DOB, address, XP/progress |
| `/profile` + `ProfileForm` | chemistry FE | Account fields; optional soft nudge — **not** a Lab wall |
| `AuthGateModal` + `isLabBlocked()` | chemistry FE | **Guest 2-chemical cap only** (P0: profile hard gate removed) |
| BYOK Groq keys | MySQL `alyra_perfumer_user_secrets` (or file fallback) | Correctly separate; never belongs on profile |
| Chats | MySQL `alyra_perfumer_chats` / messages | UID-scoped direction |

**Hard product gates (keep):** guest → login (2 chemical adds); Master Perfumer chat → auth + BYOK.  
**Not a gate:** demographics (gender / age / phone completeness). Soft prompts + Settings only.

P0 is **reconcile + unblock**; P1 ships the real nested Settings UI + agent injection; P2 ships to prod behind the QA gate.

---

## Decisions (locked)

Neil (2026-08-10):

| # | Topic | Decision |
|---|--------|----------|
| 1 | **Gate removal** | **YES** — remove hard profile gate (`isLabBlocked` / “Finish your profile” wall requiring gender+DOB). Signed-in users use Lab/Chat without demographics. |
| 2 | **DOB vs age band** | Prefer **age band** going forward for product + agent context. DOB is not the agent-facing field; demote/remove DOB from progressive UI in P1. |
| 3 | **Phone** | **YES** — keep phone as a profile field; collect in progressive / Settings flow (and signup if useful). **Not** a hard Lab trap. |
| 4 | **Consent** | Default = **take consent** (opt-in). Capture consent when saving prefs / first profile complete. Do **not** silently use prefs for the agent without consent flags. Default UX asks for consent rather than assuming opt-out. |
| 5 | **Settings IA** | **One nested Settings page** — single Settings with nested sections (Account, Perfume prefs, Consent, BYOK link). Not many separate pages. |
| 6 | **Groq ↔ profile** | **YES link only** — profile may show `groqConfigured` + deep-link to BYOK/key management. **Never** store keys (or ciphertext) on profile. |

---

## 1. Goals

Profile exists so Alyra can personalize without re-asking every session.

| Goal | Uses profile for |
|------|------------------|
| Perfume briefs | Climate, occasion defaults, scent prefs, skin sensitivity, budget band |
| India context | Locale, city/region → heat/humidity heuristics in agent prompts |
| Full Settings UI | One nested Settings: account + perfume prefs + consent + BYOK status (not the key) |
| Agent injection | Prefs (when `consentPersonalization`) into Perfumer system/brief context on chat/stream |
| Analytics (aggregate) | Funnel by locale/age-band/consent; **no** raw PII in session notes |
| Production ship | FE+BE profile to prod with env, migrations, QA gate |
| Teacher / org later | Display name + org membership (out of P0–P2; leave hooks) |
| Not goals | Storing Groq keys on profile; replacing Firebase Auth; blocking Lab until demographics filled |

---

## 2. Data model

Split into **identity/progress** (already Firestore) vs **perfume preferences** (new, agent-facing). Mark **PII** vs **preference**.

### A. Identity + lab progress (keep on Firestore `users/{uid}`)

| Field | Type | Class | Notes |
|-------|------|-------|-------|
| `email` | string | **PII** | From Auth |
| `displayName` | string? | **PII** | Signup / Settings |
| `phone` | string? | **PII** | **Wanted** — collect in signup/Settings; optional for Lab unlock |
| `gender` | enum? | **PII** / sensitive | Optional; `prefer_not_to_say` allowed |
| `dob` | ISO date? | **PII** | Legacy / optional account-private only; **not** for agent. Prefer age band in product UI (P1) |
| `ageBand` | enum | Preference / weak PII | **Canonical for product + agent:** `u18` \| `18_24` \| `25_34` \| `35_44` \| `45_plus` \| `unspecified` |
| `address`, `pincode` | string | **PII** | Keep optional; low value for perfume agent |
| `xp`, `discoveredIds`, `badgeIds`, … | progress | Non-PII | Existing gamification — do not move in P0 |
| `createdAt`, `updatedAt` | number | Meta | Existing |

### B. Perfume prefs (new — recommend MySQL; see §3)

| Field | Type | Class | Notes |
|-------|------|-------|-------|
| `uid` | PK | Link | Firebase UID |
| `locale` | string | Preference | e.g. `en-IN` |
| `indiaCity` | string? | Preference / weak PII | City name or region slug, not full address |
| `climateHint` | enum? | Preference | `hot_humid` \| `hot_dry` \| `temperate` \| `unknown` — can be derived from city |
| `scentFamiliesLiked` | JSON string[] | Preference | e.g. `["citrus","woody"]` |
| `scentFamiliesDisliked` | JSON string[] | Preference | |
| `skinSensitivity` | enum? | Preference / health-ish | `none` \| `mild` \| `high` \| `unspecified` |
| `budgetBand` | enum? | Preference | `value` \| `mid` \| `prestige` \| `unspecified` |
| `occasionDefaults` | JSON string[] | Preference | e.g. `["daily","office","wedding"]` |
| `ageBand` | enum? | Preference / weak PII | Mirror or primary store for agent-facing band (align with Firestore or MySQL — pick one source of truth in P1) |
| `consentAnalytics` | bool | Consent | Aggregate product analytics — **opt-in** (default false until user consents) |
| `consentPersonalization` | bool | Consent | Allow agent to use prefs in prompts — **opt-in** (default false until captured on prefs save / first complete) |
| `consentMarketing` | bool | Consent | Default false; unused until email exists |
| `profileCompleteness` | 0–100 | Meta | Computed soft score for UX prompts |
| `groqConfigured` | bool? | **Derived / link only** | Optional response field from secrets existence check — **not** a stored secret; never persist key material here |
| `createdAt`, `updatedAt` | datetime | Meta | |

**Hard rule:** never store Groq keys, BYOK ciphertext, or provider secrets on either profile document/table. See §8.

### Completeness (soft)

Replace lab-blocking “name+phone+gender+DOB required” with:

- **Lab unlocked:** Firebase `user` present (guest gate unchanged: 2 chemical adds).
- **Chat unlocked:** signed-in + BYOK key (unchanged).
- **Profile soft score:** displayName + any 2 of {locale/city, scent prefs, ageBand, sensitivity, budget, phone}.
- **Never** block chat/BYOK/lab pours on soft score.

---

## 3. Where stored

### Recommendation

| Data | Store | Why |
|------|--------|-----|
| Auth identity | Firebase Auth | Already canonical |
| Lab progress + basic account fields | Firestore `users/{uid}` | Already wired; XP sync via `/api/progress` |
| Perfume prefs + consent flags | **MySQL** `alyra_perfumer_profiles` | Same stack as chats/secrets; BE agent can load prefs by `uid` without Firestore Admin on every chat |
| Groq keys | `alyra_perfumer_user_secrets` only | Unchanged — profile may *link* via `groqConfigured` boolean only |

**Why not “everything in Firestore”?** Perfumer BE already talks MySQL for chats/keys. Putting agent prefs only in Firestore forces Admin SDK / extra hop on every personalization path and duplicates the BYOK/chat ownership model.

**Why not “move all PII to MySQL and abandon Firestore profile”?** Progress/XP/badges and existing `/profile` form already live there. Migrating in P0 is churn. Soften the gate; add MySQL prefs beside it.

**OSS self-host:** MySQL optional (file/JSON fallback for profiles, same pattern as `userKeyStore` / `chatStore`). Document env: DB URL or `PERFUMER_PROFILE_STORE=file`.

---

## 4. APIs

Prefer **Perfumer BE** (UID already on `req.perfumerUser`), not a second chemistry-only profile API for prefs.

| Method | Path | Auth | Body / behavior |
|--------|------|------|-----------------|
| `GET` | `/api/perfumer/profile` | Firebase Bearer | Returns perfume prefs + soft completeness + optional `groqConfigured` (derived from secrets store, not stored on profile row); 404 → empty defaults |
| `PUT` | `/api/perfumer/profile` | Firebase Bearer | Upsert prefs; schema validation (Zod/Joi); strip unknown keys; **reject** any key/secret fields; set consent flags only when explicitly provided |
| (existing) | Firestore client updates | Auth user | Keep for name/phone/gender/(legacy DOB)/address; P1 adds ageBand |
| (existing) | BYOK key routes | Firebase Bearer | Unchanged — read/write `alyra_perfumer_user_secrets` only |

Optional thin proxy: chemistry `GET/PUT /api/profile` that forwards to Perfumer with the user token — only if FE must avoid CORS to ZPL; otherwise call Perfumer like chats/keys.

**Validation sketch (PUT):**

- `locale`: string max 16
- `indiaCity`: string max 64
- enums closed-set (incl. `ageBand`)
- arrays max length (e.g. 12 families)
- booleans for consent (no silent default-true on server)
- reject any `apiKey` / `groq` / `secret` / `ciphertext` / `encryptedKey` fields with 400

**Auth:** same middleware as chats/keys. Rate-limit PUT lightly (e.g. 30/hour/uid).

---

## 5. UX flow

```
Guest (≤1 add) → Lab free
Guest (2 adds) → AuthGate “Sign up / Log in”     ← keep (only hard FE Lab gate)
Signed in → Lab free (no gender/DOB wall)         ← P0 locked
Signed in, no Groq key → BYOK onboarding         ← keep (chat path only)
Incomplete prefs → soft prompt / Settings        ← never modal trap
First saved formula OR Nth chat → “Personalize briefs?” (consent opt-in)
Settings (one page, nested sections) → Account + perfume prefs + Consent + BYOK status
```

### Reconcile existing gender/DOB gate (P0 — done / finishing)

1. **Remove** profile hard block from `isLabBlocked()` — signed-in ⇒ Lab allowed.
2. **AuthGateModal** = guest soft-cap only (no “Finish your profile” trap).
3. Signup may collect displayName + phone; **do not** require gender/DOB/ageBand to use Lab/Chat.
4. `/profile` remains for account fields; onboarding is optional nudge with **Skip to lab**, not a wall.
5. **Full Settings UI (P1):** **one nested Settings page** — sections: Account (name, phone, gender, ageBand), Perfume prefs, Consent (opt-in toggles; ask explicitly on first save), BYOK status chip (`groqConfigured`) → deep-link to key onboarding. Never paste keys into profile forms.
6. Soft prompt: dismissible banner after first formula / after BYOK save — not a `z-[80]` modal that traps the desk.

Copy direction: “Help Alyra tailor India-climate briefs” — not “Add gender and date of birth to keep experimenting.”

### Full profile Settings UI (deliverable — not a sketch)

Concrete FE surface (P1) — **single Settings with nested sections**:

| Section | Behavior |
|---------|----------|
| Account | displayName, phone (wanted), optional gender, **ageBand** (not DOB for new UX) — Firestore writes |
| Perfume prefs | locale, indiaCity, climateHint (or derived), scent likes/dislikes, sensitivity, budget, occasions — MySQL via Perfumer API |
| Consent | personalization / analytics / marketing — **opt-in**; captured on save / first complete; agent uses prefs only if `consentPersonalization` |
| Completeness | soft score meter; never blocks Lab |
| BYOK link | show “Groq connected” / “Add Groq key” from `groqConfigured`; deep-link existing `GroqKeyOnboarding` — **no key input on profile form** |
| Save | optimistic or explicit Save; toast on success; validation errors inline |

---

## 6. Agent injection (deliverable)

When `consentPersonalization` is true, Perfumer chat/stream loads prefs for `req.perfumerUser.uid` and injects a compact brief into system / tool context.

**BE tasks (P1):**

| Task | Notes |
|------|-------|
| Load prefs on chat/stream (and any brief-builder path) | Same MySQL/file store as `GET /profile` |
| Gate on `consentPersonalization` | If false or missing, inject nothing (opt-in default) |
| Compact brief memory / system snippet | e.g. locale, city, climateHint, liked/disliked families, sensitivity, budget, occasions, **ageBand** — **no** phone/DOB/address/email |
| Token budget | Cap snippet size (e.g. ≤400 tokens); omit empty fields |
| Logging | Do not log full prefs blob to ntfy/session notes; aggregate flags only |

**FE tasks (P1):**

| Task | Notes |
|------|-------|
| Settings copy explaining personalization | What Alyra will use vs never send; ask for consent (opt-in) |
| Reflect consent toggle immediately on next message | Or document “applies to next chat turn” |

Do **not** inject Groq key material, ciphertext, or secrets-store rows into the agent context — keys are used only by the BE provider client.

---

## 7. Privacy

| Topic | Policy |
|-------|--------|
| Consent | **Opt-in (locked).** `consentPersonalization` / `consentAnalytics` default **false** until user explicitly consents on prefs save / first profile complete. Never silently use prefs for agent. |
| Analytics | Aggregate only when `consentAnalytics`; never log raw phone/DOB/address into ntfy/Obsidian/sessions |
| Retention | Delete MySQL profile row + secrets + chats on account delete (hook TBD); Firestore user doc same |
| Minimization | **ageBand** for agent prompts; DOB if kept is account-private, never sent to Groq |
| Prompts | Inject prefs into system/brief context only if personalization consent on |
| Secrets | Profile APIs never accept or return raw keys / ciphertext |
| OSS | Self-hosters must set DB (or file store), document retention, and that they are data controllers for any PII they enable; ship with personalization **off** until admin enables |

---

## 8. Groq keys ↔ profile (link only)

Neil locked: link / `groqConfigured` only.

| Allowed on profile | Forbidden on profile |
|--------------------|----------------------|
| `groqConfigured: boolean` (derived at read time from secrets store) | Raw Groq API key |
| Hint / deep-link to BYOK onboarding | Ciphertext / encrypted key blob |
| UX copy: “Key managed in Chat settings” / Settings → BYOK section | Any field named `apiKey`, `groqKey`, `secret`, etc. |

**Existing BYOK stays in `alyra_perfumer_user_secrets`** (or file fallback). Profile and secrets share `uid` only.

### What “migration” means here

1. Ensure profile `GET/PUT` **do not duplicate** secrets — no second key column on `alyra_perfumer_profiles`.
2. If any mistaken design (sketch, spike, or future PR) stored keys or ciphertext on the profile document/table, migrate **out** to `alyra_perfumer_user_secrets` and delete those fields from profile.
3. Optional one-time audit script: scan profile rows for suspicious key-shaped fields; report + scrub (ops, not user-facing).

### Out of scope / Forbidden (Groq on profile)

**Forbidden:** storing raw Groq API keys or ciphertext on the profile document/table. Ever. BYOK stays in `alyra_perfumer_user_secrets` only (link/`groqConfigured` on profile — see table above).

### If “keys on profile” was the ask — why not

Putting keys (even encrypted) on the profile row:

- Duplicates the secrets store and doubles leak surface (every profile read becomes a secret read).
- Mixes PII/prefs with high-value credentials — worse blast radius on a prefs dump or overly broad `SELECT *`.
- Breaks the existing BYOK rotate/delete flows already wired to `alyra_perfumer_user_secrets`.
- Temptation to inject “profile” wholesale into prompts would risk key exfiltration via model context.

**Locked:** use link/`groqConfigured` only. Settings co-location of BYOK *status* is UX — not the same database row.

---

## 9. Phased rollout

### P0 — Unblock + API skeleton (1–2 days)

| Task | Owner |
|------|-------|
| **Remove** hard profile gate (`isLabBlocked` guest-only; AuthGateModal guest-only) | **FE** ← locked decision #1 |
| Keep guest 2-add gate + BYOK gate as the only hard product gates | **FE** |
| Signup → Lab (optional profile nudge with Skip); no demographics wall | **FE** |
| MySQL `alyra_perfumer_profiles` (+ file fallback); migration SQL / store init | **BE** |
| `GET/PUT /api/perfumer/profile` + validation (reject secret fields; consent opt-in defaults) | **BE** |
| Optional `groqConfigured` on GET via secrets existence check (no key bytes) | **BE** |
| Thin FE client + temporary Settings stub **only if needed to unblock API QA** — real nested Settings is P1 | **FE** |
| Doc: never put keys on profile; update OSS BYOK doc with one-liner cross-link | **FE/docs** |

### P1 — Full UI + agent injection

| Task | Owner |
|------|-------|
| **One nested Settings page** (Account + Perfume prefs + Consent + BYOK link) | **FE** |
| Soft banner after first formula / N chats → open Settings / prefs sheet (consent ask) | **FE** |
| Pref fields: scent likes/dislikes, sensitivity, budget, occasions | **FE + BE** |
| Soft `profileCompleteness` for UI | **BE** (compute) / **FE** (display) |
| **Age band** in account/prefs UI; demote DOB (legacy optional or drop from new UX) | **FE** |
| Phone kept as optional Account field (wanted; not Lab gate) | **FE** |
| Consent: opt-in capture on prefs save / first complete; copy explains agent use | **FE + BE** |
| **Agent injection:** load prefs on chat/stream when `consentPersonalization`; compact system/brief snippet (**ageBand**, no DOB/phone) | **BE** |
| Vitest for profile client/validation; BE unit tests for reject-secret + injection gate | **FE + BE** |

### P2 — Prod ship + unify hooks

| Task | Owner |
|------|-------|
| **Production deploy checklist** (see §10) — FE+BE profile to prod | **Ops / Release** after QA PASS |
| Env vars for profile store (MySQL URL or `PERFUMER_PROFILE_STORE=file`) on prod hosts | **Ops** |
| Run profile table migration on prod MySQL; verify file fallback off in prod | **BE / Ops** |
| Polish single nested Settings (Firestore identity + MySQL prefs + BYOK link) | **FE** |
| Account delete cascade (Auth + Firestore + MySQL chats/secrets/profile) | **BE + FE** |
| Teacher/org membership fields (separate table) | later |
| Analytics dimensions from consented prefs | admin / data |

---

## 10. Production deploy checklist (P2)

Pipeline law: **Development → QA (browse + tests + verdict) → Deployment**. Do **not** ship without vault session `qa_status: PASS`.

| Step | Notes |
|------|-------|
| 1. Code complete | P0+P1 merged; no secrets in repo |
| 2. Migrations | Apply `alyra_perfumer_profiles` on prod MySQL; confirm indexes on `uid` |
| 3. Env | Prod DB URL / store mode; same Firebase project as chats/keys; no new Groq server keys required for profile |
| 4. QA gate | Browse Settings save/load; soft gate gone; chat with personalization on/off; BYOK still via secrets; confirm profile GET never returns key material; consent defaults false until opt-in |
| 5. Verdict | Session note `qa_status: PASS` via `chemlab-qa-lead` / pipeline |
| 6. Deploy | Chemistry FE + Perfumer BE (and admin only if touched); follow `chemlab-deploy-*` / Release Captain |
| 7. Smoke post-deploy | Signed-in user: prefs persist; agent brief reflects prefs only with consent; rotate Groq key still works; profile row has no key columns |
| 8. Rollback | Feature migration down or feature-flag injection off if agent quality regresses |

Refuse prod ship if QA did not PASS. Offer to run `chemlab-qa-lead` / `chemlab-dev-pipeline`.

---

## Out of scope / Forbidden (this plan)

- Teacher CMS / org SSO packs (leave hooks only)
- **Replacing Firebase Auth or inventing a second identity store**
- **Forbidden:** storing raw Groq API keys or ciphertext on the profile document/table (see §8)
- **Forbidden:** reintroducing demographics as a Lab/Chat hard gate

~~Previously deferred — now in-scope above:~~ full profile UI + agent injection (§5–6, P1); deploy / production ship (§10, P2); Groq key relationship as link-only (§8).

## Related docs

- `docs/alyra-perfumer-security-auth-plan.md` — Firebase token on Perfumer APIs
- `docs/oss-byok-groq.md` — keys in `alyra_perfumer_user_secrets` only
- Vault pointer: `/Users/neil/Documents/chemlab/Agents/Alyra/plans/user-profile.md`
