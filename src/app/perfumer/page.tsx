"use client";

import { AppHeader } from "@/components/auth/AppHeader";
import { PerfumerChat } from "@/perfumer/PerfumerChat";

export default function PerfumerPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_#f3efe6_0%,_#ebe8e2_45%,_#e4e0d6_100%)]">
      <AppHeader subtitle="Master Perfumer" />
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4">
        <PerfumerChat />
      </div>
    </div>
  );
}
