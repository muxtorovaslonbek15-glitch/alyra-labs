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
import { DeskSimTicker } from "@/desk/DeskSimTicker";
import { ExplanationPanel } from "@/explanation/ExplanationPanel";
import {
  GamificationBar,
  RecipeJournal,
} from "@/gamification/GamificationBar";
import { GuestCapBanner } from "@/gamification/GuestCapBanner";
import { StarMilestoneNotice } from "@/gamification/StarMilestoneNotice";
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
import { useAuthStore } from "@/store/authStore";
import { labCopy } from "@/lab/labCopy";
import { currentVesselCard, SLOT_ORIGIN_WEAR_PHONE } from "@/desk/vesselLayout";
import { useMdUp } from "@/desk/useMdUp";
import { track } from "@/lib/analytics/track";
import { PerfumeAtelier } from "@/perfume/PerfumeAtelier";
import { MarketPanel } from "@/perfume/MarketPanel";
import { FreeformPerfumeBuilder } from "@/perfume/FreeformPerfumeBuilder";
import { getPerfumeRecipe } from "@/domains/chemistry/perfume";
import { InventionShelf } from "@/invention/InventionShelf";
import { InventionRemixWatcher } from "@/invention/InventionRemixWatcher";
import { useInventionStore } from "@/store/inventionStore";
import {
  buildChatBridgeFromDesk,
  consumeLabBridge,
  deskContentsFromBridge,
  peekLabSession,
  storeChatBridge,
  storeLabSession,
  clearLabSession,
} from "@/perfumer/labBridge";
import { getVesselContents } from "@/desk/vesselContents";
import { LAB_CHEMICAL_IDS } from "@/perfumer/labIngredientMap";
import { MobileBuilderChrome } from "@/desk/MobileBuilderChrome";
import { DesktopBuilderChrome } from "@/desk/DesktopBuilderChrome";
import {
  ChatDockDropZones,
  useChatDockDragState,
} from "@/desk/ChatDockDrag";
import {
  LabOverflowMenu,
  type LabOverflowAction,
} from "@/desk/LabOverflowMenu";
import { ChatHistoryCanvas } from "@/perfumer/ChatHistoryCanvas";
import { useBuilderStore, type BuilderTab } from "@/store/builderStore";
import { useGoalStore } from "@/store/goalStore";
import { STAR_MILESTONE_COUNT } from "@/lib/stars/milestone";
import {
  CostumeLayer,
  costumeLayoutClass,
  costumeLeftWidthVar,
} from "@/animation/CostumeLayer";
import { MOTION_MS } from "@/animation/motion";
import { useDeferredSwap, usePresence } from "@/animation/usePresence";
import type { User } from "firebase/auth";
import {
  AudienceChooser,
  ExperienceToggle,
  WearChrome,
  WearDeskOverlay,
  replyToWearChip,
  useWearStore,
} from "@/wear";
import type { OccasionChip } from "@/wear/houseSkus";

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
  const tabDeepLinkApplied = useRef(false);

  const [mode, setMode] = useState<LabMode>("desk");
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [atelierOpen, setAtelierOpen] = useState(false);
  const [milestoneForce, setMilestoneForce] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const lastRecorded = useRef<string | null>(null);
  const lastInfoMix = useRef<number | null>(null);
  const deskPointer = useRef<{ x: number; y: number } | null>(null);

  const setBuilderTab = useBuilderStore((s) => s.setTab);
  const leftOpen = useBuilderStore((s) => s.leftOpen);
  const setLeftOpen = useBuilderStore((s) => s.setLeftOpen);
  const leftWidth = useBuilderStore((s) => s.leftWidth);
  const setLeftWidth = useBuilderStore((s) => s.setLeftWidth);
  const rightOpen = useBuilderStore((s) => s.rightOpen);
  const rightSlot = useBuilderStore((s) => s.rightSlot);
  const setRightOpen = useBuilderStore((s) => s.setRightOpen);
  const chatDock = useBuilderStore((s) => s.chatDock);
  const centerView = useBuilderStore((s) => s.centerView);
  const setPlan = useBuilderStore((s) => s.setPlan);
  const hydratePanelPrefs = useBuilderStore((s) => s.hydratePanelPrefs);
  const dockDrag = useChatDockDragState();
  const historyOpen = centerView === "history";
  const { displayed: dockDisplayed, phase: dockPhase } =
    useDeferredSwap(chatDock);
  const dockMotionClass =
    dockPhase === "out"
      ? "lab-dock-fade-out"
      : dockPhase === "in"
        ? "lab-dock-fade-in"
        : "";

  const mdUp = useMdUp();
  const audience = useWearStore((s) => s.audience);
  const wearHydrated = useWearStore((s) => s.hydrated);
  const chooserOpen = useWearStore((s) => s.chooserOpen);
  const skuChooserNeeded = useWearStore((s) => s.skuChooserNeeded);
  const hydrateWear = useWearStore((s) => s.hydrateFromWindow);
  const setAudience = useWearStore((s) => s.setAudience);
  const isWear = audience === "owner";
  const wearCostume = usePresence(isWear, MOTION_MS.crossfade);
  const composeCostume = usePresence(!isWear, MOTION_MS.crossfade);
  const stars = useProgressStore((s) => s.stars);
  const signedIn = useAuthStore((s) => s.user);
  const showMilestoneAction =
    Boolean(signedIn) && stars >= STAR_MILESTONE_COUNT;

  useEffect(() => {
    hydratePanelPrefs();
  }, [hydratePanelPrefs]);

  useEffect(() => {
    hydrateWear();
  }, [hydrateWear]);

  useEffect(() => {
    if (!isWear) return;
    useAuthStore.getState().closeAuthGate();
    const goals = useGoalStore.getState();
    goals.setPickerOpen(false);
    goals.setGuideOpen(false);
    goals.dismissReward();
    setJournalOpen(false);
  }, [isWear]);
  useEffect(() => {
    if (!hydrated || !wearHydrated || !isWear) return;
    if (skuChooserNeeded) return;
    const desk = useDeskStore.getState();
    if (!desk.vessels.some((v) => v.equipmentId === "tin")) {
      desk.placeEquipment(
        "tin",
        mdUp ? undefined : { ...SLOT_ORIGIN_WEAR_PHONE },
      );
    }
    const tin = useDeskStore
      .getState()
      .vessels.find((v) => v.equipmentId === "tin");
    if (tin) {
      if (!mdUp) {
        desk.moveVessel(tin.instanceId, { ...SLOT_ORIGIN_WEAR_PHONE });
      }
      desk.setActiveVessel(tin.instanceId);
    }
  }, [hydrated, wearHydrated, isWear, skuChooserNeeded, mdUp]);

  useEffect(() => {
    if (!hydrated) return;
    useDeskStore.getState().nudgeOverlappingVessels();
  }, [hydrated, wearHydrated, isWear, mdUp]);

  /** ⌘B / Ctrl+B inventory · ⌘T / Ctrl+T chat|tutor (steal new-tab while in Lab). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "b" && key !== "t") return;
      const lab = document.querySelector(".lab-app");
      const target = e.target as Node | null;
      const inLab =
        Boolean(lab && target && lab.contains(target)) ||
        document.activeElement === document.body ||
        document.activeElement === document.documentElement ||
        Boolean(
          lab &&
            document.activeElement &&
            lab.contains(document.activeElement),
        );
      if (!inLab) return;
      e.preventDefault();
      e.stopPropagation();
      if (key === "b") {
        if (useWearStore.getState().audience === "owner") return;
        setLeftOpen(!useBuilderStore.getState().leftOpen);
        return;
      }
      setRightOpen(!useBuilderStore.getState().rightOpen);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [setLeftOpen, setRightOpen]);

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

  /** Perfumer → Lab bridge: ?bridge=1 loads Plan (default) or instant with ?instant=1 */
  useEffect(() => {
    if (!hydrated || bridgeApplied.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wantsBridge = params.get("bridge") === "1";
    // Tab deep-link handled by dedicated one-shot effect; skip here to avoid fights.
    if (!wantsBridge) return;
    bridgeApplied.current = true;
    const bridge = consumeLabBridge();
    const instant = params.get("instant") === "1";
    router.replace("/lab", { scroll: false });
    if (!bridge) {
      showToast({
        title: "No formula to load",
        detail: "Open a formula from Chat again.",
      });
      return;
    }
    setPlan(bridge);
    useBuilderStore.getState().lockPlan();
    storeLabSession(bridge);
    useWearStore.getState().setAudience("composer");
    setBuilderTab("chat");

    if (!instant) {
      showToast({
        title: "Plan locked",
        detail: "Press Build to pour on the desk.",
      });
      track("builder_plan_ready", {
        mapped: bridge.mappingReport?.mappedCount ?? 0,
        unmapped: bridge.mappingReport?.unmappedCount ?? 0,
        title: bridge.title,
        from: "bridge",
      });
      track("perfumer_lab_bridge", {
        mapped: bridge.mappingReport?.mappedCount ?? 0,
        unmapped: bridge.mappingReport?.unmappedCount ?? 0,
        title: bridge.title,
        mode: "plan",
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
      autoMix: true,
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
    track("perfumer_lab_bridge", {
      mapped,
      unmapped,
      title: bridge.title,
      mode: "instant",
    });
    showToast({
      title: unmapped > 0 ? `Placed ${mapped} materials` : "On your desk",
      detail: bridge.title,
    });
  }, [hydrated, loadFormula, router, setBuilderTab, setPlan]);

  const canSendToPerfumer = (() => {
    const vessel =
      vessels.find((v) => v.instanceId === activeVesselId) || vessels[0];
    if (!vessel) return false;
    const contents = getVesselContents(vessel);
    return contents.some(
      (c) => LAB_CHEMICAL_IDS.has(c.chemicalId) && c.amountMl > 0,
    );
  })();

  function sendDeskToPerfumer() {
    const vessel =
      vessels.find((v) => v.instanceId === activeVesselId) || vessels[0];
    if (!vessel) {
      showToast({
        title: "Empty desk",
        detail: "Pour materials into a beaker first.",
      });
      return;
    }
    const contents = getVesselContents(vessel).map((c) => ({
      chemicalId: c.chemicalId,
      amountMl: c.amountMl,
      name: getChemical(c.chemicalId)?.name,
    }));
    const session = peekLabSession();
    const built = buildChatBridgeFromDesk({
      contents,
      equipmentId:
        vessel.equipmentId === "flask" || vessel.equipmentId === "test-tube"
          ? vessel.equipmentId
          : "beaker",
      heatAttached: vessel.heatAttached,
      sessionBridge: session?.bridge || null,
      title: session?.bridge?.title,
    });
    if ("error" in built) {
      showToast({ title: "Cannot send to chat", detail: built.error });
      return;
    }
    storeChatBridge(built);
    clearLabSession();
    track("perfumer_chat_bridge", {
      mapped: built.bridge.mappingReport.mappedCount,
      unmapped: built.bridge.mappingReport.unmappedCount,
      title: built.title,
    });
    // Stay in Lab shell — Chat tab ingests the bridge payload.
    setBuilderTab("chat");
    showToast({
      title: "Sent to Chat",
      detail: "Continue refining in the Chat rail.",
    });
  }

  function onAudienceChange(next: "owner" | "composer") {
    setAudience(next);
    track("audience_choose", { audience: next });
    useWearStore.getState().setSheetOpen(false);
    if (next === "composer") {
      setLeftOpen(true);
      setRightOpen(true);
    } else {
      setTutorOpen(false);
      setJournalOpen(false);
    }
    useDeskStore.getState().nudgeOverlappingVessels();
  }

  function onWearChip(chip: OccasionChip) {
    replyToWearChip(chip);
    useWearStore.getState().setSheetOpen(true);
    track("wear_chip", { chip });
  }

  /** Deep-link: /lab?tab=chat|tutor|information (legacy ?tab=lab → Chat). Once only. */
  useEffect(() => {
    if (typeof window === "undefined" || tabDeepLinkApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab !== "chat" && tab !== "tutor" && tab !== "lab" && tab !== "information")
      return;
    tabDeepLinkApplied.current = true;
    const next: BuilderTab =
      tab === "tutor" || tab === "information" ? "tutor" : "chat";
    setBuilderTab(next);
    if (next === "tutor") setTutorOpen(true);
    else setTutorOpen(false);
    // Strip ?tab= without router.replace — App Router can restore the old search.
    const keep = new URLSearchParams();
    if (params.get("fromLab") === "1") keep.set("fromLab", "1");
    const qs = keep.toString();
    const path = qs ? `/lab?${qs}` : "/lab";
    if (window.location.pathname + window.location.search !== path) {
      window.history.replaceState(window.history.state, "", path);
    }
  }, [setBuilderTab]);

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
    const mixAt = v?.fx.mixAt ?? 0;
    if (
      !isWear &&
      mixAt > 0 &&
      mixAt !== lastInfoMix.current &&
      Date.now() - mixAt < 8000
    ) {
      lastInfoMix.current = mixAt;
      setBuilderTab("tutor");
      setTutorOpen(true);
    }
    if (lastRecorded.current === result.discoveryId) return;
    lastRecorded.current = result.discoveryId;
    const { isNew, newBadges, questCompleted } = recordDiscovery(result);
      track("desk_mix", {
        discoveryId: result.discoveryId,
        ok: result.ok,
      });
    if (isNew) {
      showToast({
        title: result.ok ? "Discovery" : "Hazard noted",
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
          title: "Quest complete",
          detail: questCompleted.prompt,
        });
      }
    } else {
      const quest = useProgressStore.getState().advanceQuestIfNeeded(result);
      if (quest.completed && quest.prompt) {
        showToast({
          title: "Quest complete",
          detail: quest.prompt,
        });
      }
    }
  }, [vessels, lastExplanationVesselId, recordDiscovery, isWear, setBuilderTab]);

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
            x: Math.max(
              8,
              dropPos.x - rect.left - currentVesselCard().width / 2,
            ),
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
        <CostumeLayer
          mounted={composeCostume.mounted}
          visible={composeCostume.visible}
          className={
            isWear
              ? "pointer-events-none absolute inset-x-0 top-0 z-[1]"
              : undefined
          }
        >
          <GuestCapBanner />
        </CostumeLayer>
        <StarMilestoneNotice
          forceOpen={milestoneForce}
          onClose={() => setMilestoneForce(false)}
        />
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-lab-ink px-3 py-1.5 md:gap-3 md:px-4">
          <div className="min-w-0 shrink-0">
            <h1 className="leading-none">
              <AlyraMark
                size="sm"
                href={null}
                onDark
                className="max-w-full"
                wordmarkClassName="md:text-xl"
              />
            </h1>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            {mode === "desk" ? (
              <ExperienceToggle
                value={audience}
                onChange={onAudienceChange}
              />
            ) : (
              <button
                type="button"
                onClick={() => setMode("desk")}
                className="flex h-8 min-h-8 items-center rounded-lg bg-lab-foam px-3 text-xs font-semibold leading-none text-lab-ink outline-none focus-visible:ring-1 focus-visible:ring-white/35"
              >
                Back to desk
              </button>
            )}
            <GamificationBar />
            <LabOverflowMenu
              actions={
                (isWear
                  ? [
                      {
                        id: "guide",
                        label: "How it works",
                        href: "/lab/guide",
                      },
                      {
                        id: "refill",
                        label: "Refill on alyra.in",
                        onClick: () =>
                          window.open(
                            "https://www.alyra.in/",
                            "_blank",
                            "noopener,noreferrer",
                          ),
                      },
                      ...(showMilestoneAction
                        ? [
                            {
                              id: "milestone",
                              label: "Write Neil · 30★",
                              onClick: () => setMilestoneForce(true),
                              dividerBefore: true,
                            } satisfies LabOverflowAction,
                          ]
                        : []),
                      {
                        id: "profile",
                        label: "Profile",
                        href: "/profile",
                        dividerBefore: true,
                      },
                    ]
                  : [
                  {
                    id: "guide",
                    label: "How it works",
                    href: "/lab/guide",
                  },
                  {
                    id: "information",
                    label: "Information",
                    onClick: () => {
                      setBuilderTab("tutor");
                      setTutorOpen(true);
                      track("tutor_open");
                    },
                    dividerBefore: true,
                  },
                  {
                    id: "journal",
                    label: "Recipe log",
                    onClick: () => setJournalOpen(true),
                  },
                  {
                    id: "scan",
                    label: mode === "scan" ? "Back to desk" : "Scan formula",
                    onClick: () =>
                      setMode(mode === "scan" ? "desk" : "scan"),
                  },
                  {
                    id: "perfume",
                    label: "Perfume Atelier",
                    onClick: () => {
                      setMarketOpen(false);
                      setFreeformOpen(false);
                      useInventionStore.getState().setShelfOpen(false);
                      setAtelierOpen(true);
                    },
                  },
                  {
                    id: "market",
                    label: "Market",
                    onClick: () => {
                      setAtelierOpen(false);
                      setFreeformOpen(false);
                      useInventionStore.getState().setShelfOpen(false);
                      setMarketOpen(true);
                      track("market_open", { from: "overflow" });
                    },
                  },
                  {
                    id: "shelf",
                    label: "Invention Shelf",
                    onClick: () => {
                      setAtelierOpen(false);
                      setMarketOpen(false);
                      setFreeformOpen(false);
                      useInventionStore.getState().setShelfOpen(true);
                      track("shelf_open", { from: "overflow" });
                    },
                  },
                  {
                    id: "goals",
                    label: "Recipes",
                    onClick: () => useGoalStore.getState().setPickerOpen(true),
                  },
                  ...(showMilestoneAction
                    ? [
                        {
                          id: "milestone",
                          label: "Write Neil · 30★",
                          onClick: () => setMilestoneForce(true),
                        } satisfies LabOverflowAction,
                      ]
                    : []),
                  {
                    id: "profile",
                    label: "Profile",
                    href: "/profile",
                    dividerBefore: true,
                  },
                ]) satisfies LabOverflowAction[]
              }
            />
          </div>
        </header>

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
            <CostumeLayer
              mounted={mdUp || composeCostume.mounted}
              visible={composeCostume.visible}
              className={costumeLayoutClass(
                !isWear,
                "left",
                isWear || leftOpen ? "md:overflow-hidden" : "",
              )}
              style={costumeLeftWidthVar(!isWear, leftOpen, leftWidth)}
            >
            <ItemPanel
              desktopOpen={leftOpen}
              desktopWidth={leftWidth}
              onDesktopResize={(dx) => setLeftWidth(leftWidth + dx)}
              onToggleDesktop={() => setLeftOpen(!leftOpen)}
              onOpenChat={() => {
                setBuilderTab("chat");
                setTutorOpen(false);
              }}
            />
            </CostumeLayer>
            <div
              className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
                dockDisplayed === "bottom" && rightSlot === "chat" && rightOpen
                  ? "gap-0 p-0 md:pt-2 md:px-2 md:pb-0"
                  : "gap-0 p-0 md:gap-0 md:p-2"
              }`}
            >
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <div
                  className={`h-full lab-crossfade ${
                    historyOpen
                      ? "lab-crossfade-out md:pointer-events-none"
                      : "lab-crossfade-in"
                  }`}
                >
                  <DeskSimTicker />
                  <DeskWorkspace
                    hideTools={wearCostume.mounted}
                    flushBottom={
                      !historyOpen &&
                      !isWear &&
                      dockDisplayed === "bottom" &&
                      rightSlot === "chat" &&
                      rightOpen
                    }
                    onOpenAtelier={() => {
                      setMarketOpen(false);
                      setFreeformOpen(false);
                      useInventionStore.getState().setShelfOpen(false);
                      setAtelierOpen(true);
                    }}
                  />
                  <CostumeLayer
                    mounted={wearCostume.mounted && !historyOpen}
                    visible={wearCostume.visible}
                    className="pointer-events-none absolute inset-0 z-30"
                  >
                    <WearDeskOverlay
                      onChip={onWearChip}
                      onCompose={() => onAudienceChange("composer")}
                    />
                  </CostumeLayer>
                  <CostumeLayer
                    mounted={composeCostume.mounted && !historyOpen}
                    visible={composeCostume.visible}
                  >
                    <div
                      className={`pointer-events-none absolute left-3 right-3 z-30 flex flex-col items-start gap-2 md:left-3 md:right-auto ${
                        dockDisplayed === "bottom" &&
                        rightSlot === "chat" &&
                        rightOpen
                          ? "bottom-3"
                          : "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-3"
                      }`}
                    >
                      {canSendToPerfumer ? (
                        <div className="pointer-events-auto w-[min(100%,17rem)] max-w-sm">
                          <button
                            type="button"
                            onClick={sendDeskToPerfumer}
                            className="min-h-11 w-full rounded-lg bg-lab-ink px-4 py-2.5 text-sm font-semibold text-lab-foam shadow-lg transition hover:bg-lab-ink/90 md:min-h-10"
                          >
                            Send desk to Chat
                          </button>
                          <p className="mt-1 px-0.5 text-[10px] leading-snug text-white/70 drop-shadow-sm">
                            Continue refining this blend in Chat
                          </p>
                        </div>
                      ) : null}
                      <div className="pointer-events-auto w-[min(100%,17rem)] max-w-sm">
                        <GoalGuidePanel />
                      </div>
                    </div>
                  </CostumeLayer>
                </div>
                {composeCostume.mounted ? <ChatHistoryCanvas /> : null}
              </div>
              {/* Desktop bottom dock — flush under wood; phone keeps sheets */}
              <CostumeLayer
                mounted={composeCostume.mounted && dockDisplayed === "bottom"}
                visible={composeCostume.visible}
                className={`${dockMotionClass}${
                  isWear
                    ? " pointer-events-none absolute inset-x-0 bottom-0 z-[1]"
                    : ""
                }`}
              >
                <DesktopBuilderChrome dock="bottom" />
              </CostumeLayer>
            </div>
            <div className="contents md:relative md:flex md:h-full md:shrink-0">
              <CostumeLayer
                mounted={wearCostume.mounted}
                visible={wearCostume.visible}
                className={costumeLayoutClass(isWear, "right")}
              >
                <WearChrome
                  placement="rail"
                  onAskCompose={() => onAudienceChange("composer")}
                />
              </CostumeLayer>
              <CostumeLayer
                mounted={composeCostume.mounted}
                visible={composeCostume.visible}
                className={costumeLayoutClass(!isWear, "right")}
              >
                <ExplanationPanel
                  mobileOpen={tutorOpen}
                  onMobileOpenChange={(open) => {
                    setTutorOpen(open);
                    if (open) setBuilderTab("tutor");
                  }}
                  desktopOpen={rightSlot === "tutor" && rightOpen}
                  onToggleDesktop={() => {
                    if (rightSlot === "tutor" && rightOpen) {
                      setRightOpen(false);
                    } else {
                      setBuilderTab("tutor");
                    }
                  }}
                />
                {dockDisplayed === "right" ? (
                  <div className={dockMotionClass}>
                    <DesktopBuilderChrome dock="right" />
                  </div>
                ) : null}
              </CostumeLayer>
            </div>
            <CostumeLayer
              mounted={wearCostume.mounted}
              visible={wearCostume.visible}
            >
              <WearChrome
                placement="phone"
                onAskCompose={() => onAudienceChange("composer")}
              />
            </CostumeLayer>
            <CostumeLayer
              mounted={composeCostume.mounted}
              visible={composeCostume.visible}
            >
            <MobileBuilderChrome
              tutorOpen={tutorOpen}
              onTutorOpenChange={setTutorOpen}
            />
            </CostumeLayer>
            {composeCostume.mounted ? (
            <ChatDockDropZones
              active={dockDrag.active}
              hover={dockDrag.hover}
              chatDock={chatDock}
            />
            ) : null}
          </div>
        )}

        <RecipeJournal
          open={journalOpen}
          onClose={() => setJournalOpen(false)}
        />
        <ToastHost />
        {composeCostume.mounted ? (
          <GoalPicker
            onOpenAtelier={() => {
              setMarketOpen(false);
              setFreeformOpen(false);
              useInventionStore.getState().setShelfOpen(false);
              setAtelierOpen(true);
            }}
          />
        ) : null}
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
        <MarketPanel open={marketOpen} onClose={() => setMarketOpen(false)} />
        <InventionShelf />
        <GoalRewardOverlay />
        <GoalProgressWatcher />
        <InventionRemixWatcher />
        <AuthGateModal />
        {chooserOpen ? (
          <AudienceChooser
            onChooseWear={() => onAudienceChange("owner")}
            onChooseCompose={() => onAudienceChange("composer")}
          />
        ) : null}
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
