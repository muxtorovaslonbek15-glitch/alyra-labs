"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ItemPanel } from "@/panel/ItemPanel";
import { DeskWorkspace } from "@/desk/DeskWorkspace";
import { ExplanationPanel } from "@/explanation/ExplanationPanel";
import {
  GamificationBar,
  RecipeJournal,
} from "@/gamification/GamificationBar";
import { ToastHost, showToast } from "@/gamification/ToastHost";
import { useDeskStore } from "@/store/deskStore";
import { useProgressStore } from "@/store/progressStore";
import { DESK_SURFACE, parseVesselId, type DragPayload } from "@/drag/types";
import { EQUIPMENT_BY_ID } from "@/domains/chemistry/data/equipment";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { GoalPicker } from "@/goals/GoalPicker";
import { GoalGuidePanel } from "@/goals/GoalGuidePanel";
import { GoalProgressWatcher } from "@/goals/GoalProgressWatcher";
import { AlyraMark } from "@/components/brand/AlyraMark";
import { GoalRewardOverlay } from "@/goals/GoalRewardOverlay";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { NavChrome } from "@/components/auth/NavChrome";
import { useAuthStore } from "@/store/authStore";
import { labCopy } from "@/lab/labCopy";
import { VESSEL_CARD } from "@/desk/vesselLayout";
import { track } from "@/lib/analytics/track";
import { PerfumeAtelier } from "@/perfume/PerfumeAtelier";
import { MarketPanel } from "@/perfume/MarketPanel";
import { StarShopModal } from "@/perfume/StarShopModal";
import { FreeformPerfumeBuilder } from "@/perfume/FreeformPerfumeBuilder";
import { getPerfumeRecipe } from "@/domains/chemistry/perfume";
import { InventionShelf } from "@/invention/InventionShelf";
import { InventionRemixWatcher } from "@/invention/InventionRemixWatcher";
import { useInventionStore } from "@/store/inventionStore";
import {
  consumeLabBridge,
  deskContentsFromBridge,
} from "@/perfumer/labBridge";
import type { User } from "firebase/auth";

const ScanWorkbench = dynamic(
  () => import("@/scan/ScanWorkbench").then((m) => m.ScanWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-lab-muted">
        Opening scan…
      </div>
    ),
  },
);

type LabMode = "desk" | "scan";

export function LabShell() {
  const placeEquipment = useDeskStore((s) => s.placeEquipment);
  const addChemicalToVessel = useDeskStore((s) => s.addChemicalToVessel);
  const attachHeat = useDeskStore((s) => s.attachHeat);
  const attachCool = useDeskStore((s) => s.attachCool);
  const stirVessel = useDeskStore((s) => s.stirVessel);
  const loadFormula = useDeskStore((s) => s.loadFormula);
  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const vessels = useDeskStore((s) => s.vessels);
  const lastExplanationVesselId = useDeskStore((s) => s.lastExplanationVesselId);
  const recordDiscovery = useProgressStore((s) => s.recordDiscovery);
  const router = useRouter();
  const bridgeApplied = useRef(false);

  const [mode, setMode] = useState<LabMode>("desk");
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [atelierOpen, setAtelierOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const lastRecorded = useRef<string | null>(null);
  const deskPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const finish = () => setHydrated(true);
    const unsubDesk = useDeskStore.persist.onFinishHydration(finish);
    const unsubProgress = useProgressStore.persist.onFinishHydration(finish);
    if (
      useDeskStore.persist.hasHydrated() &&
      useProgressStore.persist.hasHydrated()
    ) {
      finish();
    }
    // Soft-launch failsafe: never leave users on the splash forever
    const timeout = window.setTimeout(finish, 2500);
    return () => {
      unsubDesk();
      unsubProgress();
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    track("page_view", { surface: "lab" });
  }, []);

  /** Perfumer → Lab bridge: sessionStorage payload + ?bridge=1 */
  useEffect(() => {
    if (!hydrated || bridgeApplied.current) return;
    if (typeof window === "undefined") return;
    const wantsBridge = new URLSearchParams(window.location.search).get("bridge") === "1";
    if (!wantsBridge) return;
    bridgeApplied.current = true;
    const bridge = consumeLabBridge();
    router.replace("/lab", { scroll: false });
    if (!bridge) {
      showToast({
        title: "No formula to load",
        detail: "Open a formula from Perfumer again.",
      });
      return;
    }
    const contents = deskContentsFromBridge(bridge);
    if (!contents.length) {
      showToast({
        title: "Nothing mapped",
        detail: "These materials are not in Lab inventory yet.",
      });
      return;
    }
    const vesselId = loadFormula({
      equipmentId: bridge.vessel?.equipmentId || "beaker",
      contents,
      contentIds: contents.map((c) => c.chemicalId),
      autoMix: Boolean(bridge.vessel?.autoMix),
      heatAttached: Boolean(bridge.vessel?.heatAttached),
    });
    if (!vesselId) {
      showToast({
        title: "Could not load",
        detail: "Sign in or finish the guest gate to place materials.",
      });
      return;
    }
    const mapped = bridge.mappingReport?.mappedCount ?? contents.length;
    const unmapped = bridge.mappingReport?.unmappedCount ?? 0;
    const total = mapped + unmapped;
    track("perfumer_lab_bridge", {
      mapped,
      unmapped,
      title: bridge.title,
    });
    if (unmapped > 0) {
      const missing = (bridge.mappingReport?.unmappedIds || [])
        .slice(0, 6)
        .join(", ");
      showToast({
        title: `Placed ${mapped} of ${total} materials`,
        detail: missing
          ? `Not in Lab yet: ${missing}${(bridge.mappingReport?.unmappedIds?.length || 0) > 6 ? "…" : ""}`
          : bridge.title,
      });
    } else {
      showToast({
        title: "On your desk",
        detail: bridge.title,
      });
    }
  }, [hydrated, loadFormula, router]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (
      window as unknown as {
        __chemlab?: {
          runPair: (
            equipmentId: string,
            a: string,
            b: string,
            heat?: boolean,
          ) => unknown;
          /** Dev-only: unlock desk actions without Firebase (QA / dogfood). */
          unlockLab: () => void;
          loadPerfume: (recipeId: string) => string | null;
        };
      }
    ).__chemlab = {
      runPair: (equipmentId, a, b, heat) =>
        useDeskStore.getState().runPair(equipmentId, a, b, heat),
      unlockLab: () => {
        useAuthStore.setState({
          guestChemicalAdds: 0,
          authGateOpen: false,
          user: {
            uid: "dev-qa",
            email: "qa@localhost",
          } as User,
          profile: {
            email: "qa@localhost",
            displayName: "QA Tester",
            phone: "9999999999",
            gender: "prefer_not_to_say",
            dob: "2000-01-01",
            address: "",
            pincode: "",
            xp: useProgressStore.getState().xp,
            discoveredIds: useProgressStore.getState().discoveredIds,
            badgeIds: useProgressStore
              .getState()
              .badges.filter((b) => b.earnedAt)
              .map((b) => b.id),
            stars: useProgressStore.getState().stars,
            lastDailyStarAt: useProgressStore.getState().lastDailyStarAt,
            unlockedShopItemIds:
              useProgressStore.getState().unlockedShopItemIds,
            completedPerfumeIds:
              useProgressStore.getState().completedPerfumeIds,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
      },
      loadPerfume: (recipeId) => {
        const recipe = getPerfumeRecipe(recipeId);
        if (!recipe) return null;
        useDeskStore.setState({
          vessels: [],
          activeVesselId: null,
          lastExplanationVesselId: null,
        });
        const id = useDeskStore
          .getState()
          .placeEquipment("beaker", { x: 140, y: 90 });
        if (!id) return null;
        for (const chemId of recipe.requiredChemicalIds) {
          useDeskStore.getState().addChemicalToVessel(id, chemId);
        }
        useDeskStore.getState().stirVessel(id);
        useDeskStore.getState().mixVessel(id);
        return id;
      },
    };
    return () => {
      delete (window as unknown as { __chemlab?: unknown }).__chemlab;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    const v = vessels.find((x) => x.instanceId === lastExplanationVesselId);
    const result = v?.lastResult;
    if (!result?.discoveryId) return;
    if (lastRecorded.current === result.discoveryId) return;
    lastRecorded.current = result.discoveryId;
    const { isNew, xpGained, newBadges, questCompleted } =
      recordDiscovery(result);
      track("desk_mix", {
        discoveryId: result.discoveryId,
        ok: result.ok,
      });
    if (isNew) {
      showToast({
        title: result.ok
          ? `+${xpGained} XP · Discovery`
          : `+${xpGained} XP · Hazard noted`,
        detail: result.label ?? result.explanationKey,
      });
      for (const badge of newBadges) {
        showToast({
          title: `Badge: ${badge.title}`,
          detail: badge.description,
        });
      }
      if (questCompleted) {
        showToast({
          title: `Quest complete · +${questCompleted.xpGained} XP`,
          detail: questCompleted.prompt,
        });
      }
    } else {
      const quest = useProgressStore.getState().advanceQuestIfNeeded(result);
      if (quest.completed && quest.prompt) {
        showToast({
          title: `Quest complete · +${quest.xpGained} XP`,
          detail: quest.prompt,
        });
      }
    }
  }, [vessels, lastExplanationVesselId, recordDiscovery]);

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragPayload | undefined;
    setActiveDrag(data ?? null);
  }

  function onDragMove(event: DragMoveEvent) {
    const rect = event.active.rect.current.translated;
    if (rect) {
      deskPointer.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const payload = event.active.data.current as DragPayload | undefined;
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!payload || !overId) return;

    if (payload.type === "equipment") {
      const eq = EQUIPMENT_BY_ID[payload.itemId];
      if (!eq) return;
      if (eq.function === "heat-source") {
        const vesselId = parseVesselId(overId) ?? activeVesselId;
        if (vesselId) {
          attachHeat(vesselId);
          showToast(labCopy.burnerOn);
        }
        return;
      }
      if (eq.function === "cold-source") {
        const vesselId = parseVesselId(overId) ?? activeVesselId;
        if (vesselId) {
          attachCool(vesselId);
          showToast(labCopy.iceBathOn);
        }
        return;
      }
      if (eq.function === "stirring") {
        const vesselId = parseVesselId(overId) ?? activeVesselId;
        if (vesselId) {
          stirVessel(vesselId, true);
          showToast(labCopy.stirring);
        }
        return;
      }
      if (overId === DESK_SURFACE || parseVesselId(overId)) {
        const dropPos = deskPointer.current;
        const deskEl = document.querySelector<HTMLElement>("[data-lab-desk]");
        let position: { x: number; y: number } | undefined;
        if (dropPos && deskEl) {
          const rect = deskEl.getBoundingClientRect();
          position = {
            x: Math.max(8, dropPos.x - rect.left - VESSEL_CARD.width / 2),
            y: Math.max(8, dropPos.y - rect.top - 40),
          };
        }
        placeEquipment(payload.itemId, position);
        track("desk_place_equipment", { equipmentId: payload.itemId });
      }
      return;
    }

    if (payload.type === "chemical") {
      const vesselId =
        parseVesselId(overId) ??
        (overId === DESK_SURFACE ? activeVesselId : null);
      if (!vesselId) {
        showToast(labCopy.dropOntoVessel);
        return;
      }
      const beforeBlocked = useAuthStore.getState().isLabBlocked();
      const ok = addChemicalToVessel(vesselId, payload.itemId);
      if (ok) {
        track("desk_add_chemical", { chemicalId: payload.itemId });
      }
      if (ok) {
        const chem = getChemical(payload.itemId);
        showToast(labCopy.pourOk(chem?.formula ?? payload.itemId));
        const adds = useAuthStore.getState().guestChemicalAdds;
        if (!useAuthStore.getState().user && adds === 1) {
          showToast(labCopy.guestOneLeft);
        }
      } else if (beforeBlocked || useAuthStore.getState().isLabBlocked()) {
        showToast(labCopy.signUpToPour);
      } else {
        showToast(labCopy.pourFail);
      }
    }
  }

  const overlayIcon =
    activeDrag?.type === "chemical"
      ? getChemical(activeDrag.itemId)?.icon
      : activeDrag
        ? EQUIPMENT_BY_ID[activeDrag.itemId]?.icon
        : null;
  const overlayLabel =
    activeDrag?.type === "chemical"
      ? getChemical(activeDrag.itemId)?.formula
      : activeDrag
        ? EQUIPMENT_BY_ID[activeDrag.itemId]?.name
        : null;
  const overlayColor =
    activeDrag?.type === "chemical"
      ? getChemical(activeDrag.itemId)?.color
      : undefined;

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-lab-wash">
        <p className="font-display text-2xl text-lab-ink">Alyra Labs</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <div className="lab-app flex h-dvh flex-col overflow-hidden bg-lab-wash">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-lab-ink px-3 py-1.5 md:gap-3 md:px-4">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="leading-none">
              <AlyraMark
                size="sm"
                href={null}
                onDark
                className="max-w-full"
                wordmarkClassName="md:text-2xl"
              />
            </h1>
            <p className="mt-0.5 hidden max-w-md truncate text-[11px] text-lab-foam/55 md:block">
              {mode === "desk"
                ? "Compose notes on the desk — press, warm, wear."
                : "Scan notes into editable formulas — hover each piece to learn."}
            </p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <NavChrome onDark />
            <div className="flex rounded-lg bg-white/10 p-0.5">
              {(
                [
                  ["desk", "Desk"],
                  ["scan", "Scan"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  aria-pressed={mode === id}
                  className={`min-h-9 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition md:min-h-0 md:py-1 ${
                    mode === id
                      ? "bg-lab-foam text-lab-ink shadow-sm"
                      : "text-lab-foam/65 hover:text-lab-foam"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <GamificationBar
          onOpenAtelier={() => {
            setShopOpen(false);
            setMarketOpen(false);
            setFreeformOpen(false);
            useInventionStore.getState().setShelfOpen(false);
            setAtelierOpen(true);
          }}
          onOpenShop={() => {
            setAtelierOpen(false);
            setMarketOpen(false);
            setFreeformOpen(false);
            useInventionStore.getState().setShelfOpen(false);
            setShopOpen(true);
          }}
          onOpenMarket={() => {
            setAtelierOpen(false);
            setShopOpen(false);
            setFreeformOpen(false);
            useInventionStore.getState().setShelfOpen(false);
            setMarketOpen(true);
            track("market_open", { from: "bar" });
          }}
          onOpenShelf={() => {
            setAtelierOpen(false);
            setShopOpen(false);
            setMarketOpen(false);
            setFreeformOpen(false);
            useInventionStore.getState().setShelfOpen(true);
            track("shelf_open", { from: "bar" });
          }}
        />

        {mode === "scan" ? (
          <div className="min-h-0 flex-1 overflow-hidden bg-lab-panel/40">
            <ScanWorkbench
              onClose={() => setMode("desk")}
              onAddChemical={(chemicalId) => {
                const vesselId = activeVesselId ?? vessels[0]?.instanceId;
                if (!vesselId) {
                  showToast(labCopy.noVessel);
                  setMode("desk");
                  return;
                }
                const beforeBlocked = useAuthStore.getState().isLabBlocked();
                const ok = addChemicalToVessel(vesselId, chemicalId);
                if (!ok) {
                  showToast(
                    beforeBlocked || useAuthStore.getState().isLabBlocked()
                      ? labCopy.signUpToPour
                      : labCopy.pourFail,
                  );
                  return;
                }
                showToast({
                  title: "Added to vessel",
                  detail: getChemical(chemicalId)?.name ?? chemicalId,
                });
              }}
              onRunOnDesk={(chemicalIds) => {
                setMode("desk");
                const id =
                  useDeskStore.getState().placeEquipment("beaker", {
                    x: 140,
                    y: 90,
                  }) ?? useDeskStore.getState().activeVesselId;
                if (!id) {
                  showToast({
                    title: "Couldn't place beaker",
                    detail: "Try again from the desk",
                  });
                  return;
                }
                const added: string[] = [];
                const failed: string[] = [];
                for (const chemId of chemicalIds) {
                  if (useDeskStore.getState().addChemicalToVessel(id, chemId)) {
                    added.push(chemId);
                  } else {
                    failed.push(chemId);
                  }
                }
                if (added.length === 0) {
                  showToast(
                    useAuthStore.getState().isLabBlocked()
                      ? labCopy.signUpToPour
                      : labCopy.pourFail,
                  );
                  return;
                }
                showToast({
                  title: "Ready on desk",
                  detail:
                    failed.length > 0
                      ? `${added.join(" + ")} added · ${failed.length} skipped — stir or Mix`
                      : `${added.join(" + ")} — stir or Mix to react`,
                });
              }}
            />
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <ItemPanel
              onOpenTutor={() => {
                setTutorOpen(true);
                track("tutor_open");
              }}
            />
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden p-0 md:gap-1 md:p-2">
              <DeskWorkspace
                onOpenAtelier={() => {
                  setShopOpen(false);
                  setMarketOpen(false);
                  setFreeformOpen(false);
                  useInventionStore.getState().setShelfOpen(false);
                  setAtelierOpen(true);
                }}
              />
              <div className="pointer-events-none absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3 z-30 flex justify-start md:bottom-3 md:left-3 md:right-auto">
                <div className="pointer-events-auto w-[min(100%,17rem)] max-w-sm">
                  <GoalGuidePanel />
                </div>
              </div>
            </div>
            <ExplanationPanel
              mobileOpen={tutorOpen}
              onMobileOpenChange={setTutorOpen}
            />
          </div>
        )}

        <div className="hidden md:block">
          <RecipeJournal />
        </div>
        <ToastHost />
        <GoalPicker
          onOpenAtelier={() => {
            setShopOpen(false);
            setMarketOpen(false);
            setFreeformOpen(false);
            useInventionStore.getState().setShelfOpen(false);
            setAtelierOpen(true);
          }}
        />
        <PerfumeAtelier
          open={atelierOpen}
          onClose={() => setAtelierOpen(false)}
          onOpenFreeform={() => {
            setAtelierOpen(false);
            setFreeformOpen(true);
          }}
        />
        <FreeformPerfumeBuilder
          open={freeformOpen}
          onClose={() => setFreeformOpen(false)}
        />
        <StarShopModal open={shopOpen} onClose={() => setShopOpen(false)} />
        <MarketPanel open={marketOpen} onClose={() => setMarketOpen(false)} />
        <InventionShelf />
        <GoalRewardOverlay />
        <GoalProgressWatcher />
        <InventionRemixWatcher />
        <AuthGateModal />
      </div>

      <DragOverlay dropAnimation={null}>
        {overlayLabel ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-lab-teal/50 bg-white px-2 py-1.5 text-xs shadow-2xl">
            <span className="text-base">{overlayIcon}</span>
            <span className="font-mono font-medium text-lab-ink">
              {overlayLabel}
            </span>
            {overlayColor ? (
              <span
                className="ml-1 h-6 w-6 rounded-full shadow-inner ring-2 ring-white"
                style={{ background: overlayColor }}
              />
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
