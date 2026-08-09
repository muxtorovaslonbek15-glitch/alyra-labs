# RELEASE DONE — Live sim + solid tin mega-batch

**as of:** 2026-08-10  
**Agent:** chemlab-release-captain  
**Vault session:** `Sessions/2026-08-10-alyra-live-sim-solid.md` (`qa_status: PASS`)

## Verdict

**SHIPPED.** Solid tin Cast reveal + always-alive heat/cool/evaporate/stir sim + Lab UI polish live on prod. Auth still gated. No Groq burn in release QA.

## Commits

| Repo | SHA | Note |
|------|-----|------|
| chemistry `main` | `0dcd158` | Solid tin + live sim + guide Try-in-chat + chrome motion |
| chemistry `main` | `a413a89` | Drop duplicate `VesselSimTicker` (DeskSimTicker only) |
| ZPL `neilo` | `2b2dd21` | No new BE feature this batch; DO pull/pm2 verified Plan-mode tip |

## Deploys

| Surface | Evidence |
|---------|----------|
| Backend DO | `pm2 restart index` after `git pull` → `2b2dd21` |
| API health | `GET /api/perfumer/health` → 200 slim, `authRequired: true` |
| API auth | `POST /api/perfumer/chat` no token → **401** `auth_required` |
| Frontend | `dpl_9osXavcxcGioZgg1MAn2ZzHP2vbF` **READY** aliased to https://alyra-labs.vercel.app |

## Online QA (min Groq — UI only)

| Check | Result |
|-------|--------|
| `/lab` loads | 200; Perfume Tin in equipment; Chat / Plan / Agent chrome |
| Chat needs login | Sign in affordances present; composer present; no anonymous send |
| `/lab/guide` | 200; Try-in-chat buttons; solid balm / monsoon solid demos |
| Auth gate API | still 401 without token |

## Live URLs

- Lab: https://alyra-labs.vercel.app/lab
- Guide: https://alyra-labs.vercel.app/lab/guide
- API health: https://www.zorastrianpremierleague.in/api/perfumer/health

## ntfy milestones

1. code ready  
2. pushed  
3. backend live  
4. frontend live  
5. QA done  
6. **FINAL** high-priority `Alyra everything live`

## Notes

- Always-alive sim was also confirmed live mid-ship by animations track; Captain landed ticker dedupe so only `DeskSimTicker` remains.
- Local leftover: uncommitted `docs/status/lab-live-sim-DONE.md` wording + `package-lock.json` noise — not product-blocking.
