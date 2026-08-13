"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { FluidState } from "./types";
import type { FluidRendererHandle } from "./createFluidRenderer";

interface Props {
  state: FluidState;
  className?: string;
  style?: CSSProperties;
  /** Called once when WebGL init fails — parent should fall back to 2D */
  onUnavailable?: () => void;
}

/**
 * WebGL liquid column for the glass well.
 * Three.js is dynamic-imported; pauses when off-screen.
 */
export function FluidVesselCanvas({
  state,
  className = "",
  style,
  onUnavailable,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<FluidRendererHandle | null>(null);
  const stateRef = useRef(state);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    stateRef.current = state;
    handleRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed) return;
    let cancelled = false;
    let handle: FluidRendererHandle | null = null;

    (async () => {
      const { createFluidRenderer } = await import("./createFluidRenderer");
      if (cancelled) return;
      handle = await createFluidRenderer(canvas);
      if (cancelled) {
        handle?.dispose();
        return;
      }
      if (!handle) {
        setFailed(true);
        onUnavailable?.();
        return;
      }
      handleRef.current = handle;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      handle.setStillWater(reduce || stateRef.current.stillWater);
      handle.setState(stateRef.current);
    })().catch(() => {
      if (!cancelled) {
        setFailed(true);
        onUnavailable?.();
      }
    });

    return () => {
      cancelled = true;
      handleRef.current = null;
      handle?.dispose();
    };
  }, [failed, onUnavailable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      handleRef.current?.setStillWater(mq.matches || stateRef.current.stillWater);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [failed]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        handleRef.current?.setActive(Boolean(entry?.isIntersecting));
      },
      { root: null, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [failed]);

  if (failed) return null;

  return (
    <div
      ref={wrapRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={style}
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
