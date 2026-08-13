"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EngineResult, LiveVesselPreview } from "@/types";
import { getFallbackExplanation } from "@/domains/chemistry/data/explanations";
import {
  isPerfumeExplanationKey,
  recipeIdFromExplanationKey,
} from "@/domains/chemistry/engine/perfumeCraft";
import { resolveScentProfile } from "@/domains/chemistry/perfume";
import { FormulaInspector } from "@/perfume/FormulaInspector";
import { ScentProfileDetails } from "@/perfume/ScentProfileDetails";
import { useDeskStore } from "@/store/deskStore";
import { useProgressStore } from "@/store/progressStore";
import { useAuthStore } from "@/store/authStore";
import { getAuthHeaders } from "@/lib/client/authHeaders";
import { labCopy } from "@/lab/labCopy";
import { RightRailShell } from "@/desk/RightRailShell";

type StreamError = "auth" | "rate" | "other";

async function streamExplanation(
  result: EngineResult,
  reactants: string[],
  onChunk?: (text: string) => void,
): Promise<{ text: string; error?: StreamError }> {
  const headers = await getAuthHeaders();
  if (!headers) {
    return { text: "", error: "auth" };
  }

  const res = await fetch("/api/explain", {
    method: "POST",
    headers,
    body: JSON.stringify({
      discoveryId: result.discoveryId,
      label: result.label,
      explanationKey: result.explanationKey,
      effects: result.effects,
      reactants,
      products: result.products.map((p) => ({ id: p.id, name: p.name })),
      ok: result.ok,
    }),
  });

  if (res.status === 401) return { text: "", error: "auth" };
  if (res.status === 429) return { text: "", error: "rate" };

  if (!res.ok || !res.body) {
    return { text: "", error: "other" };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onChunk?.(text.trim());
  }
  return { text: text.trim() };
}

export function ExplanationPanel({
  mobileOpen,
  onMobileOpenChange,
  /** Desktop only — closable right rail. Never affects `< md` phone sheet. */
  desktopOpen = true,
  onToggleDesktop,
}: {
  /** Phone sheet — controlled from the shared right FAB rail. */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  desktopOpen?: boolean;
  onToggleDesktop?: () => void;
} = {}) {
  const vessels = useDeskStore((s) => s.vessels);
  const lastId = useDeskStore((s) => s.lastExplanationVesselId);
  const activeId = useDeskStore((s) => s.activeVesselId);
  const vessel =
    vessels.find((v) => v.instanceId === lastId) ??
    vessels.find((v) => v.instanceId === activeId) ??
    vessels[0];
  const result = lastId
    ? vessels.find((v) => v.instanceId === lastId)?.lastResult
    : vessel?.lastResult;
  const livePreview = vessel?.livePreview;
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);

  const cache = useProgressStore((s) => s.explanationCache);
  const setCache = useProgressStore((s) => s.setExplanationCache);

  const discoveryId = result?.discoveryId;
  const cached = discoveryId ? cache[discoveryId] : undefined;

  const [live, setLive] = useState<{
    id: string;
    text: string;
    source: "tutor" | "fallback";
  } | null>(null);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = mobileOpen ?? internalExpanded;
  const setExpanded = (next: boolean) => {
    onMobileOpenChange?.(next);
    if (mobileOpen === undefined) setInternalExpanded(next);
  };
  const [retrying, setRetrying] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const scentProfile = useMemo(() => {
    if (!result?.ok || !isPerfumeExplanationKey(result.explanationKey)) {
      return null;
    }
    const recipeId = recipeIdFromExplanationKey(result.explanationKey);
    const productId = result.products[0]?.id;
    return resolveScentProfile({
      perfumeRecipeId: recipeId,
      productChemicalId: productId,
      goalId: productId === "cologne" ? "perfume" : undefined,
      contentIds: vessel?.contentIds,
      displayName: result.products[0]?.name,
    });
  }, [result, vessel?.contentIds]);

  useEffect(() => {
    if (!discoveryId || !result || !authReady) return;
    if (cached) return;
    if (!user) return;

    let cancelled = false;

    streamExplanation(result, vessel?.contentIds ?? [], (chunk) => {
      if (cancelled) return;
      setLive({ id: discoveryId, text: chunk, source: "tutor" });
      setExpanded(true);
      setBanner(null);
    })
      .then(({ text: t, error }) => {
        if (cancelled) return;
        if (error === "auth") {
          const next = getFallbackExplanation(result.explanationKey);
          setLive({ id: discoveryId, text: next, source: "fallback" });
          setCache(discoveryId, next);
          setBanner(labCopy.tutorSignIn);
          setExpanded(true);
          return;
        }
        if (error === "rate") {
          const next = getFallbackExplanation(result.explanationKey);
          setLive({ id: discoveryId, text: next, source: "fallback" });
          setCache(discoveryId, next);
          setBanner(labCopy.tutorRateLimited);
          setExpanded(true);
          return;
        }
        const next = t || getFallbackExplanation(result.explanationKey);
        const source: "tutor" | "fallback" = t ? "tutor" : "fallback";
        setLive({ id: discoveryId, text: next, source });
        setCache(discoveryId, next);
        setBanner(null);
        setExpanded(true);
      })
      .catch(() => {
        if (cancelled) return;
        const next = getFallbackExplanation(result.explanationKey);
        setLive({ id: discoveryId, text: next, source: "fallback" });
        setCache(discoveryId, next);
        setBanner(labCopy.tutorOffline);
        setExpanded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    discoveryId,
    result,
    vessel?.contentIds,
    cached,
    setCache,
    user,
    authReady,
  ]);

  const guestText =
    !user && authReady && result
      ? getFallbackExplanation(result.explanationKey)
      : "";
  const text =
    cached ??
    ((live && live.id === discoveryId ? live.text : "") || guestText);
  const source = cached
    ? ("saved" as const)
    : live && live.id === discoveryId
      ? live.source
      : guestText
        ? ("fallback" as const)
        : null;
  const waiting = Boolean(
    result && discoveryId && authReady && user && !text,
  );
  const showSignInBanner = Boolean(result && authReady && !user);

  async function retry() {
    if (!result || !discoveryId) return;
    if (!user) {
      setBanner(labCopy.tutorSignIn);
      return;
    }
    setRetrying(true);
    setBanner(null);
    try {
      const { text: t, error } = await streamExplanation(
        result,
        vessel?.contentIds ?? [],
        (chunk) => {
          setLive({ id: discoveryId, text: chunk, source: "tutor" });
        },
      );
      if (error === "auth") {
        const next = getFallbackExplanation(result.explanationKey);
        setLive({ id: discoveryId, text: next, source: "fallback" });
        setCache(discoveryId, next);
        setBanner(labCopy.tutorSignIn);
        return;
      }
      if (error === "rate") {
        const next = getFallbackExplanation(result.explanationKey);
        setLive({ id: discoveryId, text: next, source: "fallback" });
        setCache(discoveryId, next);
        setBanner(labCopy.tutorRateLimited);
        return;
      }
      const next = t || getFallbackExplanation(result.explanationKey);
      setLive({
        id: discoveryId,
        text: next,
        source: t ? "tutor" : "fallback",
      });
      setCache(discoveryId, next);
    } catch {
      const next = getFallbackExplanation(result.explanationKey);
      setLive({ id: discoveryId, text: next, source: "fallback" });
      setCache(discoveryId, next);
      setBanner(labCopy.tutorOffline);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      {!desktopOpen && onToggleDesktop ? (
        <div className="relative hidden h-full w-0 shrink-0 md:block">
          <button
            type="button"
            onClick={onToggleDesktop}
            aria-label="Show information"
            title="Show information"
            className="absolute right-0 top-1/2 z-20 flex h-16 w-5 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-lab-line/70 bg-lab-panel/95 text-lab-muted shadow-sm outline-none hover:text-lab-ink focus-visible:ring-1 focus-visible:ring-lab-line"
          >
            ‹
          </button>
        </div>
      ) : null}
      {/* Desktop Information rail — `hidden` baseline; RightRailShell is md+ only */}
      {desktopOpen ? (
        <RightRailShell
          asideClassName="panel-glass border-lab-line/60"
          dataAttr="lab-right-info"
        >
          <div className="flex w-full items-center justify-between border-b border-lab-line/50 px-2.5 py-2 text-left">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
                Information
              </p>
              <h2 className="mt-0.5 font-display text-base leading-tight tracking-display text-lab-ink">
                What happened
              </h2>
            </div>
            {onToggleDesktop ? (
              <button
                type="button"
                onClick={onToggleDesktop}
                aria-label="Hide information"
                className="flex h-7 w-7 items-center justify-center rounded-md text-lab-muted outline-none hover:bg-lab-wash hover:text-lab-ink focus-visible:ring-1 focus-visible:ring-lab-line"
              >
                ›
              </button>
            ) : null}
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto px-2.5 py-2 text-xs leading-snug text-lab-ink/90">
            <TutorBody
              result={result}
              livePreview={livePreview}
              user={user}
              authReady={authReady}
              waiting={waiting}
              banner={banner}
              showSignInBanner={showSignInBanner}
              text={text}
              source={source ?? undefined}
              scentProfile={scentProfile}
              retrying={retrying}
              onRetry={() => void retry()}
            />
          </div>
        </RightRailShell>
      ) : null}

      {expanded ? (
        <div
          className="fixed inset-0 z-[280] flex flex-col justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-lab-ink/45"
            aria-label="Close information"
            onClick={() => setExpanded(false)}
          />
          <div className="relative flex max-h-[72dvh] flex-col rounded-t-2xl border border-lab-line bg-lab-panel pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-lab-line" />
            <div className="flex items-center justify-between gap-3 border-b border-lab-line/50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
                  Information
                </p>
                <h2
                  id="info-sheet-title"
                  className="font-display text-lg leading-tight tracking-display text-lab-ink"
                >
                  What happened
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="min-h-11 shrink-0 rounded-lg bg-lab-ink px-3 text-xs font-semibold text-lab-foam"
              >
                Done
              </button>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-lab-ink/90">
              <TutorBody
                result={result}
                livePreview={livePreview}
                user={user}
                authReady={authReady}
                waiting={waiting}
                banner={banner}
                showSignInBanner={showSignInBanner}
                text={text}
                source={source ?? undefined}
                scentProfile={scentProfile}
                retrying={retrying}
                onRetry={() => void retry()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TutorBody({
  result,
  livePreview,
  user,
  authReady,
  waiting,
  banner,
  showSignInBanner,
  text,
  source,
  scentProfile,
  retrying,
  onRetry,
}: {
  result: EngineResult | undefined;
  livePreview: LiveVesselPreview | null | undefined;
  user: ReturnType<typeof useAuthStore.getState>["user"];
  authReady: boolean;
  waiting: boolean;
  banner: string | null;
  showSignInBanner: boolean;
  text: string;
  source: "tutor" | "fallback" | "saved" | undefined;
  scentProfile: ReturnType<typeof resolveScentProfile> | null;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <>
      {!result && !livePreview ? (
        <div className="rounded-lg bg-lab-wash/70 px-2 py-2 text-lab-muted">
          <p>
            Pour oils and ethanol, then adjust amounts — this panel tells you
            honestly what the blend would smell like and flags hazards live.
          </p>
          {!user && authReady ? (
            <p className="mt-2 text-[11px] text-lab-teal">
              <Link href="/login" className="font-semibold underline">
                Sign in
              </Link>{" "}
              to unlock live notes after Mix.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {livePreview ? (
            <FormulaInspector preview={livePreview} />
          ) : null}
          {!result ? (
            <p className="text-[11px] text-lab-muted">
              Mix when ready to lock the reaction / perfume craft.
            </p>
          ) : waiting ? (
            <p className="text-lab-muted motion-safe:animate-pulse">
              Looking up what happened…
            </p>
          ) : (
            <>
              {banner || showSignInBanner ? (
                <p className="mb-2 rounded-md bg-lab-wash px-2 py-1.5 text-[11px] text-lab-muted">
                  {banner ?? labCopy.tutorSignIn}{" "}
                  {banner === labCopy.tutorSignIn || showSignInBanner ? (
                    <Link
                      href="/login"
                      className="font-semibold text-lab-teal underline"
                    >
                      Log in
                    </Link>
                  ) : null}
                </p>
              ) : null}
              {result.label ? (
                <p className="equation-pop mb-2 rounded-lg bg-lab-ink px-2 py-1.5 font-mono text-[11px] leading-snug text-lab-foam">
                  {result.label}
                </p>
              ) : null}
              {!result.ok ? (
                <p className="mb-2 rounded-md bg-lab-hazard/15 px-2 py-1 text-[11px] font-semibold text-lab-hazard">
                  Safe-fail — combination blocked
                </p>
              ) : null}
              {result.products.length > 0 ? (
                <p className="mb-2 text-[11px] text-lab-muted">
                  Products:{" "}
                  <span className="text-lab-ink">
                    {result.products.map((p) => p.name).join(", ")}
                  </span>
                </p>
              ) : null}
              {scentProfile ? (
                <div className="mb-2">
                  <ScentProfileDetails profile={scentProfile} compact />
                </div>
              ) : null}
              <p className="whitespace-pre-wrap">{text}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={retrying || !user}
                  className="min-h-11 rounded-md border border-lab-line px-3 py-2 text-[11px] font-semibold text-lab-teal hover:bg-lab-wash disabled:opacity-50 md:min-h-0 md:px-2 md:py-1 md:text-[10px]"
                >
                  {retrying ? "…" : "Explain again"}
                </button>
                {source ? (
                  <p className="text-[9px] uppercase tracking-label text-lab-muted">
                    {source === "tutor"
                      ? labCopy.tutorLive
                      : source === "saved"
                        ? labCopy.tutorSaved
                        : labCopy.tutorOffline}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
