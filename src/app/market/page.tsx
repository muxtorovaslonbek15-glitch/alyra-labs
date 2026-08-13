"use client";

import { AppHeader } from "@/components/auth/AppHeader";
import { MarketBrowser } from "@/perfume/MarketPanel";

export default function MarketPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-lab-wash">
      <AppHeader subtitle="Browse and remix shared perfume formulas." />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
          Atelier Market
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-display text-lab-ink">
          Shared formulas
        </h1>
        <p className="mt-1 text-sm text-lab-muted">
          Browse community perfume blends, remix onto your desk, or open a
          panel study.
        </p>
        <div className="mt-6">
          <MarketBrowser />
        </div>
        <p className="mt-6 text-[11px] leading-snug text-lab-muted">
          IFRA badges are teaching screens against Alyra Labs’s{" "}
          <span className="font-mono">49th-Amendment-teaching</span> seed —
          not certified compliance.
        </p>
      </div>
    </div>
  );
}
