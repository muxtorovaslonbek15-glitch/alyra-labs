"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION_MS } from "@/animation/motion";
import { usePrefersReducedMotion } from "@/animation/useFxClock";

/**
 * Mount/unmount with soft opacity crossfade.
 * `mounted` stays true during exit so CSS can fade out before unmount.
 */
export function usePresence(
  open: boolean,
  durationMs: number = MOTION_MS.crossfade,
): { mounted: boolean; visible: boolean } {
  const reduced = usePrefersReducedMotion();
  const ms = reduced ? 0 : durationMs;
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    if (ms <= 0) {
      setMounted(false);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);

  return { mounted, visible };
}

/**
 * Delay swapping a discrete layout value (e.g. chat dock) with out→in fade.
 */
export function useDeferredSwap<T>(
  value: T,
  outMs: number = MOTION_MS.dockOut,
  inMs: number = MOTION_MS.dockIn,
): { displayed: T; phase: "idle" | "out" | "in" } {
  const reduced = usePrefersReducedMotion();
  const [displayed, setDisplayed] = useState(value);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const inTimer = useRef<number | null>(null);

  useEffect(() => {
    if (value === displayed) return;
    if (reduced) {
      setDisplayed(value);
      setPhase("idle");
      return;
    }
    setPhase("out");
    const tOut = window.setTimeout(() => {
      setDisplayed(value);
      setPhase("in");
      if (inTimer.current) window.clearTimeout(inTimer.current);
      inTimer.current = window.setTimeout(() => setPhase("idle"), inMs);
    }, outMs);
    return () => {
      window.clearTimeout(tOut);
      if (inTimer.current) window.clearTimeout(inTimer.current);
    };
  }, [value, displayed, reduced, outMs, inMs]);

  return { displayed, phase };
}
