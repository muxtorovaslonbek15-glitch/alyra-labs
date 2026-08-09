# Lab Chrome Simplification — Design

**Date:** 2026-08-10  
**Status:** Approved via user brief (opinionated approach + “Implement”)  
**Related:** DESIGN.md · `docs/alyra-perfume-builder-ide-plan.md` · prior IDE P0

## Problem

Lab header is CTA hell: duplicate Lab/Chat/Market links, segmented Lab|Tutor|Chat *plus* Scan, full NavChrome, and a second gamification toolbar (XP, goal, badges, Shop/Perfume/Market/Shelf/Goals). Desk + chat lose focus.

## Decision (chosen)

**One calm instrument bar + overflow.** Not a second redesign of the desk.

| Surface | Behavior |
|---------|----------|
| Top bar | Brand (left) · mode `Lab \| Tutor \| Chat` (center-right) · compact XP chip · overflow `⋯` |
| Overflow | Profile, Mute, Log out, Teacher, Market, Guide, Scan, Shop, Perfume Atelier, Shelf, Goals, Recipe journal entry |
| Gamification | Collapsed to one chip (`LV · XP · ★`); click opens drawer with goal, badges, claim, progress |
| Scan | Overflow item (and quiet icon optional) — not beside mode toggle |
| NavChrome on Lab | Replaced by overflow; other pages keep existing NavChrome |
| Phone | Same single bar; XP chip + overflow; no second toolbar |

## Explicit non-goals

- Removing features (rehome only)
- Dark-mode chat rail (keep paper `lab-panel` per DESIGN.md; clean hierarchy)
- Backend / Groq changes

## Companion work (same ship)

- Cleaner Chat rail (minimal header, quiet history, Plan collapsed until ready)
- Resizable L/R panels (`localStorage`)
- Guide page `/lab/guide` with CTA → `/lab`
