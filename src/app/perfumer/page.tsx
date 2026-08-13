"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Deep-link alias — Perfume Builder Chat lives inside Lab. */
export default function PerfumerPage() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qs = new URLSearchParams();
    qs.set("audience", "composer");
    qs.set("tab", "chat");
    if (params.get("fromLab") === "1" || params.get("bridge") === "1") {
      qs.set("fromLab", "1");
    }
    router.replace(`/lab?${qs.toString()}`);
  }, [router]);

  return (
    <div className="flex h-dvh items-center justify-center bg-lab-wash">
      <p className="font-display text-xl text-lab-ink">Opening Chat in Lab…</p>
    </div>
  );
}
