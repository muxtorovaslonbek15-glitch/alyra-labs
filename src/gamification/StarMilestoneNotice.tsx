"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import {
  STAR_MILESTONE_COUNT,
  milestoneDismissKey,
  starMilestoneMailto,
} from "@/lib/stars/milestone";
import { track } from "@/lib/analytics/track";

export function StarMilestoneNotice({
  forceOpen,
  onClose,
}: {
  forceOpen: boolean;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const stars = useProgressStore((s) => s.stars);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(
        window.localStorage.getItem(milestoneDismissKey(user.uid)) === "1",
      );
    } catch {
      setDismissed(false);
    }
  }, [user]);

  const eligible = Boolean(user) && stars >= STAR_MILESTONE_COUNT;
  const visible = eligible && (forceOpen || !dismissed);

  if (!visible || !user) return null;

  const uid = user.uid;

  function dismiss() {
    try {
      window.localStorage.setItem(milestoneDismissKey(uid), "1");
    } catch {
      /* ignore quota */
    }
    setDismissed(true);
    onClose();
  }

  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-lab-line bg-lab-panel px-3 py-2 md:px-4"
    >
      <p className="text-[12px] leading-snug text-lab-ink">
        <span className="font-medium text-lab-amber">{STAR_MILESTONE_COUNT}★</span>
        {" — "}
        have done 30. I will get a star.
      </p>
      <div className="flex items-center gap-1.5">
        <a
          href={starMilestoneMailto()}
          className="inline-flex min-h-9 items-center rounded-lg bg-lab-ink px-3 text-xs font-semibold text-lab-foam hover:bg-lab-ink/90"
          onClick={() => {
            track("star_milestone_mailto", { stars });
          }}
        >
          Write Neil
        </a>
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-medium text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
          onClick={dismiss}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
