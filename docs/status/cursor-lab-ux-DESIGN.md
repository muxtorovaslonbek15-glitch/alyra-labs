# Cursor Lab UX — Design

**Date:** 2026-08-10  
**Status:** Approved via user brief (Cursor refs + “Implement” + ship)  
**Related:** `DESIGN.md` · `docs/alyra-perfume-builder-ide-plan.md` · `docs/superpowers/specs/2026-08-10-lab-chrome-simplification-design.md`

## Problem (brutal)

Bottom-docked chat is a half-baked strip: messy right-rail header reused under the desk, text buttons (`Bottom` / `History` / `New`), beige gap between wood and panel, uneven Tutor|Chat cells, and helper copy with em dashes. It does not read as Cursor’s bottom panel (terminal-style) or right Agent rail.

## Decision

**Rewrite dock chrome to Cursor panel semantics.** Keep Alyra paper/wood palette (no dark-mode chat). Do not invent a fourth layout system.

### Desktop panel map

| Region | Behavior |
|--------|----------|
| Left | Inventory, collapsible `⌘B`, resizable |
| Center | Desk hero. Empty = Cursor-style shortcut cheat sheet (calm mono keys, no card stack) |
| Right | Tutor **or** Chat (mutually exclusive). Equal-width Tutor\|Chat in header (`grid-cols-2`) |
| Bottom | When chat docked: **real bottom panel under desk** — flush (no beige gap), top resize grip, tab row, messages, compact composer. Right rail closes for chat |

### Dock (`:::`)

- Visible grip (three dots / bars), not a “Bottom” text button
- Drag → Right / Bottom drop zones
- Double-click toggles right ↔ bottom (Cursor snap)
- Docking to bottom sets `chatDock: bottom` and keeps chat open under desk; docking to right restores right rail

### Chat chrome

| Dock | Chrome |
|------|--------|
| Right | Slim header: grip · title · quiet mode chip · icon actions (history / new / hide) |
| Bottom | IDE tab bar: grip · **Perfumer** tab · Plan\|Agent equal cells · icons · close. **No** duplicate “Perfumer AGENT + Bottom/History/New” strip |
| Composer | Smaller type (`text-xs` / 12px), short placeholder, **zero em dashes** in UI strings |
| Plan\|Agent | `grid-cols-2` equal cells; quiet helper (middots / plain words only) |

### Top bar

Unchanged law: brand · Tutor\|Chat equal · XP chip · `⋯`. Phone sheets untouched.

### Explicit non-goals

- Dark-mode chat
- Backend / Groq changes
- Phone three-pane
- New features beyond dock/layout polish

## Acceptance

1. Bottom dock: no beige gap; panel looks like Cursor terminal under editor  
2. `:::` drag + double-click work; no “Bottom” text control required  
3. Tutor\|Chat and Plan\|Agent cells visually equal  
4. Empty desk shortcuts accurate and calm  
5. Phone sheets still work  
6. Browser smoke + Vitest green before deploy  

## Ship path

Development → QA (browse + tests + verdict) → Vercel deploy → ntfy `chemistry`
