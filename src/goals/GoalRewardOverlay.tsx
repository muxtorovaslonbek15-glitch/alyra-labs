"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getGoal,
  type GoalVisualKind,
} from "@/domains/chemistry/data/goals";
import { resolveScentProfile } from "@/domains/chemistry/perfume";
import { ScentProfileDetails } from "@/perfume/ScentProfileDetails";
import { useGoalStore } from "@/store/goalStore";
import { useInventionStore } from "@/store/inventionStore";
import { useWearStore } from "@/wear/wearStore";
import { track } from "@/lib/analytics/track";
import { composeOverlayOpen, costumeFadeClass } from "@/animation/CostumeLayer";
import { MOTION_MS } from "@/animation/motion";
import { usePresence } from "@/animation/usePresence";

function SoapVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-44 items-end justify-center">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="reward-bubble absolute rounded-full border border-white/70 bg-white/35"
          style={{
            width: 8 + (i % 4) * 5,
            height: 8 + (i % 4) * 5,
            left: `${8 + i * 11}%`,
            bottom: 12,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
      <div className="reward-soap relative z-10">
        <div className="reward-soap-bar relative h-16 w-28 rounded-[1.1rem] bg-gradient-to-br from-[#f4e7c8] via-[#e8d4a8] to-[#d4b87a] shadow-[0_10px_20px_rgba(20,36,31,0.28),inset_0_2px_0_rgba(255,255,255,0.55)]">
          <div className="absolute inset-x-3 top-2.5 rounded-md border border-[#c9a86a]/55 bg-[#c9a86a]/15 px-1 py-0.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-label text-[#6b4e1f]">
              REACTO
            </p>
            <p className="text-[7px] font-semibold uppercase tracking-label text-[#8a6a2f]/90">
              Alyra Labs
            </p>
          </div>
          <div className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-white/70 blur-[1px]" />
          <div className="absolute bottom-2 left-3 right-3 h-1 rounded-full bg-[#b89555]/35" />
        </div>
        <p className="reward-soap-caption mt-2 text-center text-[11px] font-semibold text-lab-teal">
          {caption}
        </p>
      </div>
    </div>
  );
}

function BottleVisual({
  caption,
  label,
  fill,
}: {
  caption: string;
  label: string;
  fill: string;
}) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-40 flex-col items-center justify-end">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="reward-mist absolute rounded-full bg-lab-glass/50"
          style={{
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            left: `${35 + (i % 3) * 12}%`,
            top: 8 + i * 4,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <div className="reward-bottle relative z-10 flex flex-col items-center">
        <div className="h-3 w-4 rounded-t-sm bg-lab-ink/80" />
        <div className="h-2 w-6 rounded-sm bg-lab-amber/90" />
        <div
          className="relative h-20 w-12 overflow-hidden rounded-b-2xl rounded-t-md border border-lab-glass/60 shadow-lg"
          style={{
            background: `linear-gradient(180deg, #f7faf8 0%, ${fill} 100%)`,
          }}
        >
          <div className="absolute inset-x-2 bottom-2 top-6 rounded-b-xl bg-lab-teal/20" />
          <p className="absolute inset-x-0 top-1 text-center text-[8px] font-semibold uppercase tracking-label text-lab-teal">
            {label}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-lab-teal">{caption}</p>
    </div>
  );
}

function TabletVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-44 items-end justify-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="reward-fizz absolute rounded-full bg-white/80"
          style={{
            width: 5 + (i % 3) * 3,
            height: 5 + (i % 3) * 3,
            left: `${18 + i * 7}%`,
            bottom: 28,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
      <div className="reward-tablet relative z-10 mb-6 h-10 w-16 rounded-full border border-lab-line bg-gradient-to-b from-white to-lab-foam shadow-md">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-lab-line/80" />
      </div>
      <p className="absolute bottom-0 text-[11px] font-semibold text-lab-teal">
        {caption}
      </p>
    </div>
  );
}

function BeakerVisual({ caption, fill }: { caption: string; fill: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-40 flex-col items-center justify-end">
      <div className="reward-bottle relative z-10 flex flex-col items-center">
        <div className="h-2 w-16 rounded-t-sm border border-lab-glass/50 bg-white/40" />
        <div className="relative h-[4.75rem] w-14 overflow-hidden rounded-b-lg border border-lab-glass/60 bg-gradient-to-b from-white/70 to-lab-glass/20 shadow-lg">
          <div
            className="absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: fill }}
          />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-lab-teal">{caption}</p>
    </div>
  );
}

function FlameVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-40 flex-col items-center justify-end">
      <div className="reward-bottle relative flex h-24 w-16 items-end justify-center">
        <div className="lab-flame absolute bottom-10 h-14 w-8 rounded-[50%] bg-gradient-to-t from-lab-amber via-[#ffecb3] to-transparent opacity-90" />
        <div className="h-3 w-10 rounded-sm bg-lab-ink/70" />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-lab-teal">{caption}</p>
    </div>
  );
}

function CrystalVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-40 flex-col items-center justify-end">
      <div className="reward-bottle relative z-10 flex h-20 items-end gap-1">
        {[18, 28, 22, 14].map((h, i) => (
          <span
            key={i}
            className="block w-4 rounded-t-sm border border-lab-glass/60 bg-gradient-to-b from-white to-lab-glass/40 shadow-sm"
            style={{ height: h }}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-lab-teal">{caption}</p>
    </div>
  );
}

function GasVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-44 items-end justify-center">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="reward-bubble absolute rounded-full border border-lab-glass/50 bg-lab-foam/50"
          style={{
            width: 10 + (i % 4) * 4,
            height: 10 + (i % 4) * 4,
            left: `${10 + i * 9}%`,
            bottom: 20,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <div className="reward-bottle relative z-10 mb-2 h-16 w-10 rounded-b-xl border border-lab-glass/50 bg-white/50" />
      <p className="absolute bottom-0 text-[11px] font-semibold text-lab-teal">
        {caption}
      </p>
    </div>
  );
}

function SlimeVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-40 flex-col items-center justify-end">
      <div className="reward-soap relative z-10">
        <div className="reward-soap-bar h-14 w-24 rounded-[2rem] bg-gradient-to-br from-[#b9f6ca] via-[#69f0ae] to-[#00c853] shadow-lg" />
        <p className="reward-soap-caption mt-2 text-center text-[11px] font-semibold text-lab-teal">
          {caption}
        </p>
      </div>
    </div>
  );
}

function BalmVisual({ caption }: { caption: string }) {
  return (
    <div className="reward-stage relative mx-auto flex h-36 w-40 flex-col items-center justify-end">
      <div className="reward-bottle relative z-10 flex flex-col items-center">
        <div className="h-3 w-14 rounded-t-full bg-lab-amber/80" />
        <div className="h-12 w-16 rounded-b-xl border border-[#ffcc80] bg-gradient-to-b from-[#ffe0b2] to-[#ffb74d] shadow-md" />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-lab-teal">{caption}</p>
    </div>
  );
}

function ProductVisual({
  kind,
  caption,
  title,
}: {
  kind: GoalVisualKind;
  caption: string;
  title: string;
}) {
  const short = title.replace(/^Make (a |an )?|^Test for /i, "").slice(0, 10).toUpperCase();
  switch (kind) {
    case "soap":
      return <SoapVisual caption={caption} />;
    case "bottle":
      return <BottleVisual caption={caption} label={short} fill="#9fd4c4" />;
    case "tablet":
      return <TabletVisual caption={caption} />;
    case "beaker":
      return <BeakerVisual caption={caption} fill="rgba(26,107,92,0.35)" />;
    case "flame":
      return <FlameVisual caption={caption} />;
    case "crystal":
      return <CrystalVisual caption={caption} />;
    case "gas":
      return <GasVisual caption={caption} />;
    case "slime":
      return <SlimeVisual caption={caption} />;
    case "balm":
      return <BalmVisual caption={caption} />;
    default:
      return (
        <div className="flex h-36 items-center justify-center text-4xl">🧪</div>
      );
  }
}

export function GoalRewardOverlay() {
  const isWear = useWearStore((s) => s.audience === "owner");
  const rewardGoalId = useGoalStore((s) => s.rewardGoalId);
  const rewardStars = useGoalStore((s) => s.rewardStars);
  const dismissReward = useGoalStore((s) => s.dismissReward);
  const setPickerOpen = useGoalStore((s) => s.setPickerOpen);
  const abandonGoal = useGoalStore((s) => s.abandonGoal);

  const namingPending = useInventionStore((s) => s.namingPending);
  const confirmName = useInventionStore((s) => s.confirmName);
  const skipNaming = useInventionStore((s) => s.skipNaming);
  const setShelfOpen = useInventionStore((s) => s.setShelfOpen);
  const setRemixInventionId = useInventionStore((s) => s.setRemixInventionId);

  const [name, setName] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"celebrate" | "named">("celebrate");

  const goal = rewardGoalId ? getGoal(rewardGoalId) : undefined;

  const scentProfile = useMemo(() => {
    if (!rewardGoalId) return null;
    return resolveScentProfile({
      goalId: rewardGoalId,
      perfumeRecipeId: namingPending?.perfumeRecipeId,
      contentIds: namingPending?.snapshot.contentIds,
      displayName: namingPending?.suggestedName,
    });
  }, [rewardGoalId, namingPending]);

  const suggested = useMemo(() => {
    if (namingPending?.suggestedName) return namingPending.suggestedName;
    if (!goal) return "My creation";
    return goal.title.replace(/^Make (a |an )?/i, "").slice(0, 40);
  }, [namingPending, goal]);

  useEffect(() => {
    if (!rewardGoalId) {
      setPhase("celebrate");
      setSavedId(null);
      setName("");
      return;
    }
    setName(suggested);
    setPhase("celebrate");
    setSavedId(null);
  }, [rewardGoalId, suggested]);

  useEffect(() => {
    if (!rewardGoalId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        skipNaming();
        dismissReward();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rewardGoalId, dismissReward, skipNaming]);

  const live = composeOverlayOpen(isWear, Boolean(rewardGoalId && goal));
  const { mounted, visible } = usePresence(live, MOTION_MS.crossfade);
  const paintedGoal = useRef(goal);
  if (goal) paintedGoal.current = goal;
  const shown = goal ?? paintedGoal.current;

  if (!mounted || !shown) return null;

  function saveToShelf() {
    const inv = confirmName(name.trim() || suggested);
    if (inv) {
      setSavedId(inv.id);
      setPhase("named");
    }
  }

  function openShelf() {
    dismissReward();
    setShelfOpen(true);
    track("shelf_open", { from: "reward" });
  }

  function tryImprove() {
    if (savedId) setRemixInventionId(savedId);
    dismissReward();
    setShelfOpen(false);
  }

  function makeMore() {
    skipNaming();
    dismissReward();
    abandonGoal();
    setPickerOpen(true);
  }

  return (
    <div
      className={costumeFadeClass(
        visible,
        "fixed inset-0 z-[60] flex items-center justify-center bg-lab-ink/55 p-4 backdrop-blur-[3px]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Goal reward"
      onClick={() => {
        skipNaming();
        dismissReward();
      }}
    >
      <div
        className="reward-card flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-lab-teal/30 bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-lab-line/50 bg-gradient-to-br from-lab-teal/15 via-lab-panel to-lab-amber/10 px-4 pb-3 pt-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
            {phase === "named" ? "On your Shelf" : "You made it"}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-display text-lab-ink">
            {phase === "named"
              ? `“${name.trim() || suggested}”`
              : `${shown.icon} You made it!`}
          </h2>
          <p className="mt-1 text-sm font-semibold text-lab-ink/90">
            {phase === "named"
              ? "This is yours — remix it anytime."
              : `${shown.title.replace(/^Make /i, "")} — the real deal`}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {rewardStars > 0 ? (
              <div className="inline-flex items-baseline gap-1.5 rounded-full bg-lab-amber px-3 py-1 text-lab-ink">
                <span className="text-[10px] uppercase tracking-label">★</span>
                <span className="font-display text-lg leading-none">
                  +{rewardStars}
                </span>
              </div>
            ) : null}
            {namingPending ? (
              <div className="inline-flex items-baseline gap-1.5 rounded-full border border-lab-teal/40 bg-white px-3 py-1 text-lab-teal">
                <span className="text-[10px] uppercase tracking-label">
                  Score
                </span>
                <span className="font-display text-lg leading-none">
                  {namingPending.score}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <ProductVisual
            kind={shown.visualKind}
            caption={shown.rewardCaption}
            title={shown.title}
          />
          <p className="mt-3 text-center text-[12px] leading-snug text-lab-ink/85">
            {shown.successBlurb}
          </p>

          {scentProfile ? (
            <div className="mt-3">
              <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-label text-lab-muted">
                Perfume dossier
              </p>
              <ScentProfileDetails profile={scentProfile} />
            </div>
          ) : null}

          {phase === "celebrate" ? (
            <div className="mt-3">
              <label className="block text-center">
                <span className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
                  Name your creation
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={48}
                  placeholder={suggested}
                  className="mt-1 w-full rounded-lg border border-lab-line bg-white px-3 py-2 text-center font-display text-base text-lab-ink outline-none focus:border-lab-teal"
                  autoFocus
                />
              </label>
              {namingPending?.tier ? (
                <p className="mt-1.5 text-center text-[11px] text-lab-muted">
                  Mastery:{" "}
                  <span className="font-semibold text-lab-teal">
                    {namingPending.tier}
                  </span>
                  {" · "}
                  Name it to put it on your Shelf.
                </p>
              ) : (
                <p className="mt-1.5 text-center text-[11px] text-lab-muted">
                  Naming seals ownership — this becomes yours to improve.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 text-center">
              <p className="font-display text-base text-lab-teal">
                Can you beat your own formula?
              </p>
              <p className="mt-0.5 text-[11px] text-lab-muted">
                Remix from your Shelf and raise the score.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-lab-line/50 bg-lab-wash/40 px-4 py-3">
          {phase === "celebrate" ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-lab-line bg-white px-3 py-2 text-xs font-semibold text-lab-ink hover:bg-lab-panel"
                onClick={() => {
                  skipNaming();
                  dismissReward();
                }}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="flex-[1.4] rounded-lg bg-lab-teal px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-lab-teal/90"
                onClick={saveToShelf}
              >
                Save to My Shelf
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-lab-line bg-white px-3 py-2 text-xs font-semibold text-lab-ink hover:bg-lab-panel"
                onClick={openShelf}
              >
                Open My Shelf
              </button>
              <button
                type="button"
                className="flex-[1.4] rounded-lg bg-lab-amber px-3 py-2 text-xs font-semibold text-lab-ink shadow-sm hover:bg-lab-amber/90"
                onClick={tryImprove}
              >
                Try to improve it
              </button>
            </div>
          )}
          <button
            type="button"
            className="text-[11px] font-medium text-lab-muted hover:text-lab-ink"
            onClick={makeMore}
          >
            Make more like this →
          </button>
        </div>
      </div>
    </div>
  );
}
