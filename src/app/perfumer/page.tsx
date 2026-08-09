"use client";

import { AppHeader } from "@/components/auth/AppHeader";
import { PerfumerChat } from "@/perfumer/PerfumerChat";

export default function PerfumerPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-lab-wash">
      <AppHeader subtitle="Master Perfumer" />
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0 md:max-w-4xl md:px-4 md:pb-4 md:pt-3">
        <PerfumerChat />
      </div>
    </div>
  );
}
