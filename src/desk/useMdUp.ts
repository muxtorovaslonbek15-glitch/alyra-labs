"use client";

import { useEffect, useState } from "react";

/** Tailwind `md` breakpoint (768px). Desktop rails / closable panels apply only when true. */
export function useMdUp(): boolean {
  const [mdUp, setMdUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMdUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return mdUp;
}
