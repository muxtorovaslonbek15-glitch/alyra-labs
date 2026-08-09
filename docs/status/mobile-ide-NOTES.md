# Mobile IDE — coordination notes

**Date:** 2026-08-10  
**Owner:** mobile-ide agent  
**For:** Perfume Builder IDE P0 (desktop LabShell)

## Desk-only law (`< md`)

From `DESIGN.md` / `CLAUDE.md`:

- Phone = **desk only** — no inventory | desk | tutor columns
- Inventory + Tutor = sheets / FABs
- No recipe-log strip (`hidden md:block` already)
- No visible scrollbars in `.lab-app`
- Closable L/R panels are **desktop-only** — must never become phone columns

## Shipped (mobile agent)

| File | Role |
|------|------|
| `src/desk/LabSheet.tsx` | Shared phone bottom sheet (grabber + Done + safe-area) |
| `src/desk/useMdUp.ts` | `min-width: 768px` hook |
| `src/desk/MobileBuilderChrome.tsx` | Chat FAB, Chat/Plan sheet, Build progress chip |
| `src/panel/ItemPanel.tsx` | `desktopOpen` prop — gates **`md:flex` only** |
| `src/explanation/ExplanationPanel.tsx` | same `desktopOpen` |
| `src/store/builderStore.ts` | `beginBuilding` forces `chatSheetOpen: false` |
| `src/desk/LabShell.tsx` | Mounts `<MobileBuilderChrome />` (phone-only internally) |

## Wire when desktop closable lands

**Do not** toggle visibility with bare `flex`/`hidden` without `md:`.

```tsx
const leftOpen = useBuilderStore((s) => s.leftOpen);
const rightOpen = useBuilderStore((s) => s.rightOpen);
const rightSlot = useBuilderStore((s) => s.rightSlot);

<ItemPanel
  desktopOpen={leftOpen}
  onOpenTutor={() => { /* ... */ }}
/>

<ExplanationPanel
  desktopOpen={rightOpen && rightSlot === "tutor"}
  mobileOpen={tutorOpen}
  onMobileOpenChange={setTutorOpen}
/>

{/* Desktop Chat rail — md+ only */}
{rightOpen && rightSlot === "chat" ? (
  <aside className="hidden md:flex ...">
    <PerfumerChat variant="shell" />
    <PlanPanel ... />
  </aside>
) : null}

{/* Keep MobileBuilderChrome — it no-ops on md+ */}
<MobileBuilderChrome
  tutorOpen={tutorOpen}
  onTutorOpenChange={setTutorOpen}
/>
```

**Only pass `desktopOpen={leftOpen}` after collapse/expand chrome exists.** Wiring prefs alone can hide the inventory rail with no reopen control.

## Chat / Plan / Build on phone

1. **Chat FAB** (above Notes/Eq/+) opens `LabSheet` with `PerfumerChat variant="shell"`
2. **PlanPanel** sits in sheet footer (Build / Stop / Undo)
3. **Build** collapses sheet → slim progress chip over desk → pours visible
4. Tutor sheet ↔ Chat sheet mutually exclusive

## Conflict policy

- Desktop tabs / closable rails → IDE agent
- Phone sheets / FABs / `desktopOpen` md-guards → mobile agent
- Prefer extending `MobileBuilderChrome` / `LabSheet` over rewriting LabShell layout
