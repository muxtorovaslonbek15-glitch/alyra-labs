"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Campaign alias — Wear chrome still lives on `/lab`. */
export default function WearAliasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lab?audience=owner");
  }, [router]);

  return (
    <div className="flex h-dvh items-center justify-center bg-lab-wash">
      <p className="font-display text-xl text-lab-ink">Opening Wear…</p>
    </div>
  );
}
