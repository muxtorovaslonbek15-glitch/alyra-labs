# Plan | Agent chat mode — DONE

**Date:** 2026-08-10  
**Surface:** Alyra Lab Perfumer chat (`/lab` Chat rail + phone sheet)

## Shipped

- Cursor-like **Plan | Agent** toggle near composer (default **Agent**)
- Header mode chip + Building state while Build queue runs
- Dismissible 10-word nudge to switch to Plan (once per long draft)
- Persist preference: `localStorage` key `alyra.builder.chatMode.v1`
- API body `mode: 'plan' | 'agent'` on chat / stream
- BE: Plan-mode system hint; skip mid-loop force-generate in plan mode
- Guide: `#plan-vs-agent` section added (copyable prompts kept intact)

## Product rules

- Neither mode silent-pours; Build remains explicit
- Plan mode: propose / structure Plan panel; no desk mutations
- Agent mode: normal tools; still no auto-Build
