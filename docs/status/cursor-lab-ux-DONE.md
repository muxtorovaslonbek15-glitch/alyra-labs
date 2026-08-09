# Cursor Lab UX — DONE

**Date:** 2026-08-10  
**Design:** [`cursor-lab-ux-DESIGN.md`](./cursor-lab-ux-DESIGN.md)  
**qa_status:** PASS

## What shipped

- Cursor-style panel chrome: left inventory · desk hero · right Tutor|Chat · bottom chat panel when docked
- Bottom dock flush under desk (0px gap); square desk bottom edge when docked
- `:::` / bar grip: drag drop-zones + double-click snap right ↔ bottom (no “Bottom” text control)
- Bottom panel: IDE tab bar (Perfumer tab · Plan|Agent · icon actions)
- Right rail: slim header + icon actions; smaller composer
- Tutor|Chat and Plan|Agent equal `grid-cols-2` cells
- Empty desk: calm Cursor-style shortcut list
- Zero em dashes in Lab chat UI copy
- Phone sheets unchanged

## QA evidence

- Browser smoke on `http://localhost:3002/lab` (md layout)
  - Tutor|Chat cells equal (68×28)
  - Double-click grip: right → bottom → right
  - Desk↔bottom gap measured **0px**; desk radius `20px 20px 0 0` when bottom-docked
  - No em dash in `document.body.innerText`
- Vitest: `BuildQueue.test.ts` + `labBridge.test.ts` — 13/13 pass
- `tsc --noEmit` clean

## Deploy

Pending Release Captain / this session after commit.
