"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { labCopy } from "@/lab/labCopy";

/**
 * Guest 2-chem cap strip. Lives in document flow as the first Lab chrome
 * row so the navbar sits below it — never a fixed/z-index overlay.
 */
export function GuestCapBanner() {
  const user = useAuthStore((s) => s.user);
  const guestChemicalAdds = useAuthStore((s) => s.guestChemicalAdds);
  const guestWarn = !user && guestChemicalAdds === 1;
  const guestBlocked = !user && guestChemicalAdds >= 2;

  if (!guestWarn && !guestBlocked) return null;

  return (
    <div
      role="status"
      className={`shrink-0 px-3 py-1.5 text-center text-[11px] font-semibold md:px-4 md:py-1 ${
        guestBlocked
          ? "bg-lab-teal text-white"
          : "bg-lab-amber/90 text-lab-ink"
      }`}
    >
      {guestBlocked ? labCopy.guestBannerBlocked : labCopy.guestBannerWarn}{" "}
      <Link
        href="/signup"
        className={`underline outline-none focus-visible:ring-1 ${
          guestBlocked
            ? "focus-visible:ring-lab-foam"
            : "focus-visible:ring-lab-ink"
        }`}
      >
        {guestBlocked ? "Create account" : "Sign up"}
      </Link>
    </div>
  );
}
