"use client";

/** Retired from product chrome — `/api/stars/unlock` returns 410. Keep file for catalog reference. */
import { useMemo, useState } from "react";
import { STAR_CATALOG, type StarShopItem } from "@/domains/chemistry/perfume";
import { useProgressStore } from "@/store/progressStore";
import { useAuthStore } from "@/store/authStore";
import { getAuthHeaders } from "@/lib/client/authHeaders";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

export function StarShopModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const stars = useProgressStore((s) => s.stars);
  const unlocked = useProgressStore((s) => s.unlockedShopItemIds);
  const setStarsFromServer = useProgressStore((s) => s.setStarsFromServer);
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...STAR_CATALOG].sort((a, b) => a.price - b.price),
    [],
  );

  if (!open) return null;

  async function unlock(item: StarShopItem) {
    if (!user) {
      showToast({
        title: "Sign in required",
        detail: "Create an account to spend stars.",
      });
      return;
    }
    if (unlocked.includes(item.id)) return;
    if (stars < item.price) {
      showToast({
        title: "Not enough stars",
        detail: `Need ${item.price}★ — you have ${stars}★`,
      });
      return;
    }
    setBusy(item.id);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        showToast({
          title: "Sign in required",
          detail: "Session expired — log in again to spend stars.",
        });
        return;
      }
      const res = await fetch("/api/stars/unlock", {
        method: "POST",
        headers,
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        stars?: number;
        unlockedShopItemIds?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        showToast({
          title: "Unlock failed",
          detail: data.error ?? "Try again",
        });
        return;
      }
      setStarsFromServer({
        stars: data.stars ?? stars,
        unlockedShopItemIds: data.unlockedShopItemIds,
      });
      track("star_unlock", { itemId: item.id, price: item.price });
      showToast({
        title: `Unlocked ${item.title}`,
        detail: `−${item.price}★`,
      });
    } catch {
      showToast({ title: "Unlock failed", detail: "Network error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-lab-ink/45 p-3 pt-[8vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Star shop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-lab-line/50 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-amber">
              Star catalog
            </p>
            <h2 className="font-display text-xl text-lab-ink">
              Spend your ★ · {stars} available
            </h2>
            <p className="text-[11px] text-lab-muted">
              Virtual unlocks only — no payments or shipping.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-lab-muted hover:bg-lab-wash"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <ul className="scroll-thin max-h-[60vh] space-y-2 overflow-y-auto p-3">
          {sorted.map((item) => {
            const owned = unlocked.includes(item.id);
            const canBuy = stars >= item.price && !owned;
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-lab-line/60 bg-white/60 px-3 py-2.5"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-lab-ink">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-lab-muted">{item.description}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-label text-lab-muted">
                    {item.category.replace("-", " ")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={owned || busy === item.id}
                  onClick={() => void unlock(item)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                    owned
                      ? "bg-lab-teal/15 text-lab-teal"
                      : canBuy
                        ? "bg-lab-amber text-lab-ink hover:bg-lab-amber/90"
                        : "bg-lab-wash text-lab-muted hover:bg-lab-line/40"
                  }`}
                >
                  {owned
                    ? "Owned"
                    : busy === item.id
                      ? "…"
                      : `${item.price}★`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
