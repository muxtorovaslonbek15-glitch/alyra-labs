"use client";

import { useEffect, type ReactNode } from "react";
import { PHONE_CHAT_H } from "@/desk/phoneDock";

/**
 * Phone Compose/Wear dock: full-width nav at the thumb.
 * Open: the same nav translates up; chat occupies the space below.
 * Closed: reverse, same duration. Nav never unmounts.
 */
export function MobileBottomDock({
  open,
  onClose,
  nav,
  children,
  labelledBy,
  title,
}: {
  open: boolean;
  onClose: () => void;
  nav: ReactNode;
  children: ReactNode;
  labelledBy: string;
  title: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="lab-phone-dock-root md:hidden">
      <div
        className="lab-phone-safe pointer-events-none fixed inset-x-0 bottom-0 z-[241]"
        data-open={open ? "true" : "false"}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[env(safe-area-inset-bottom,0px)] z-[240] flex flex-col"
        data-lab-phone-dock=""
      >
        <div
          className="lab-phone-dock pointer-events-auto flex flex-col"
          data-open={open ? "true" : "false"}
          style={{ ["--lab-phone-chat-h" as string]: PHONE_CHAT_H }}
        >
          <nav
            className="relative z-10 flex w-full min-h-11 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-visible overscroll-x-contain border-t border-white/15 bg-lab-ink px-2 py-1.5"
            data-lab-phone-nav=""
            aria-label="Desk tools"
          >
            {nav}
          </nav>
          <div
            className="lab-phone-chat flex min-h-0 flex-col overflow-hidden bg-lab-panel"
            role="dialog"
            aria-modal={open}
            aria-labelledby={labelledBy}
            aria-hidden={!open}
            inert={!open}
          >
            <h2 id={labelledBy} className="sr-only">
              {title}
            </h2>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Re-export so callers can size overlays against the same token. */
export { PHONE_CHAT_H };
