"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getAllEquipment, getAllItems } from "@/domains/registry";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { EQUIPMENT_BY_ID } from "@/domains/chemistry/data/equipment";
import { DraggableItem } from "@/drag/DraggableItem";
import { useDeskStore } from "@/store/deskStore";
import { showToast } from "@/gamification/ToastHost";
import { useGoalStore } from "@/store/goalStore";
import { getGoal } from "@/domains/chemistry/data/goals";
import { useAuthStore } from "@/store/authStore";
import { labCopy } from "@/lab/labCopy";
import {
  capacityMlForEquipment,
  getVesselContents,
  softCapacityMl,
  totalMl,
} from "@/desk/vesselContents";
import { isOilItem } from "@/domains/chemistry/perfume/oilMeta";
import { useInventoryStockStore } from "@/store/inventoryStockStore";
import { formatAmount } from "@/desk/unitDisplay";
import { useUnitPrefStore } from "@/store/unitPrefStore";

type BrowseKind = "equipment" | "chemicals" | "oils";

/** Keep the left rail scannable; full catalog lives in the Show more modal. */
const SIDEBAR_PREVIEW_LIMIT = 8;

export function ItemPanel({
  onOpenTutor,
  onOpenChat,
  /** Desktop only — closable left rail. Never affects `< md` (phone stays sheet/FAB). */
  desktopOpen = true,
  onToggleDesktop,
}: {
  onOpenTutor?: () => void;
  onOpenChat?: () => void;
  desktopOpen?: boolean;
  onToggleDesktop?: () => void;
} = {}) {
  const [browse, setBrowse] = useState<BrowseKind>("equipment");
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [mounted] = useState(() => typeof window !== "undefined");

  const vessels = useDeskStore((s) => s.vessels);
  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const placeEquipment = useDeskStore((s) => s.placeEquipment);
  const addChemicalToVessel = useDeskStore((s) => s.addChemicalToVessel);
  const attachHeat = useDeskStore((s) => s.attachHeat);
  const attachCool = useDeskStore((s) => s.attachCool);
  const stirVessel = useDeskStore((s) => s.stirVessel);
  const pourAmountMl = useDeskStore((s) => s.pourAmountMl);
  const setPourAmountMl = useDeskStore((s) => s.setPourAmountMl);
  const stockMap = useInventoryStockStore((s) => s.stockMlByChemicalId);
  const restockAll = useInventoryStockStore((s) => s.restockAll);
  const stockMl = useInventoryStockStore((s) => s.stockMl);
  const unit = useUnitPrefStore((s) => s.unit);
  const cycleUnit = useUnitPrefStore((s) => s.cycleUnit);

  const activeGoalId = useGoalStore((s) => s.activeGoalId);
  const completedStepIds = useGoalStore((s) => s.completedStepIds);
  const goal = activeGoalId ? getGoal(activeGoalId) : undefined;
  const highlightIds = useMemo(
    () => new Set(goal?.highlightItemIds ?? []),
    [goal],
  );

  const currentGoalStep = useMemo(() => {
    if (!goal) return undefined;
    return goal.steps.find((s) => !completedStepIds.includes(s.id));
  }, [goal, completedStepIds]);

  // Suggest pour amount when the active step has a target for a highlighted chem
  useEffect(() => {
    if (!currentGoalStep?.targetAmounts?.length) return;
    // Prefer the last-listed target (usually the newly added chemical)
    const targets = currentGoalStep.targetAmounts;
    const newest = targets[targets.length - 1];
    if (!newest) return;
    setPourAmountMl(newest.amountMl);
  }, [currentGoalStep?.id, setPourAmountMl]);


  const items = getAllItems("chemistry");
  const equipment = getAllEquipment("chemistry");

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function selectBrowse(kind: BrowseKind) {
    setQuery("");
    setCategory("all");
    setBrowse(kind);
  }

  function openExpanded(kind: BrowseKind) {
    selectBrowse(kind);
    setExpanded(true);
  }

  const categories = useMemo(() => {
    const set = new Set(
      items
        .filter((i) => i.subcategory !== "fragrance")
        .map((i) => i.category),
    );
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  const filteredChemicals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (i.subcategory === "fragrance") return false;
      if (category !== "all" && i.category !== category) return false;
      if (!q) return true;
      const chem = getChemical(i.id);
      const hay =
        `${i.name} ${chem?.formula ?? ""} ${i.category} ${i.subcategory}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, category]);

  const filteredOils = useMemo(() => {
    const q = query.trim().toLowerCase();
    const role = category;
    return items.filter((i) => {
      const isEthanol = i.id === "c2h5oh";
      const isOil = isOilItem(i.id);
      if (!isOil && !isEthanol) return false;
      if (role === "carrier") {
        if (!isEthanol) return false;
      } else if (role === "top" || role === "heart" || role === "base") {
        const tags = i.tags.map((t) => t.toLowerCase());
        const ok =
          role === "base"
            ? tags.includes("base") || tags.includes("fixative")
            : tags.includes(role);
        if (!ok) return false;
      }
      if (!q) return true;
      const chem = getChemical(i.id);
      const hay =
        `${i.name} ${chem?.formula ?? ""} ${i.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, category]);

  const filteredEquipment = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter((i) => {
      if (!q) return true;
      return `${i.name} ${i.subcategory}`.toLowerCase().includes(q);
    });
  }, [equipment, query]);

  const targetVessel =
    vessels.find((v) => v.instanceId === activeVesselId) ?? vessels[0];

  const pourCap = targetVessel
    ? capacityMlForEquipment(targetVessel.equipmentId)
    : 50;
  const softCap = softCapacityMl(pourCap);
  const usedInTarget = targetVessel
    ? totalMl(getVesselContents(targetVessel))
    : 0;
  // Allow pour past marked capacity (overflow / foam); stop at soft ceiling
  const pourRoom = Math.max(
    0.1,
    Math.round((softCap - usedInTarget) * 10) / 10,
  );
  const pourMax = Math.min(pourCap, pourRoom);
  const pourPct = Math.min(100, (pourAmountMl / pourMax) * 100);
  const overfilled = usedInTarget > pourCap + 0.05;

  function PourAmountControl({ compact = false }: { compact?: boolean }) {
    return (
      <div
        className={
          compact
            ? "mt-1.5 space-y-1 rounded-md border border-lab-line/50 bg-white/70 px-1.5 py-1.5"
            : "space-y-1.5 rounded-lg border border-lab-line/50 bg-white/80 px-2.5 py-2"
        }
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={`font-medium text-lab-ink ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            Pour amount
          </p>
          <span
            className={`font-mono text-lab-muted ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {overfilled
              ? `${pourMax} ml (overflowing)`
              : `of ${pourMax} ml`}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-lab-wash">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-lab-teal/85 transition-[width] duration-150"
            style={{ width: `${pourPct}%` }}
          />
          <input
            type="range"
            min={0.1}
            max={pourMax}
            step={0.1}
            value={Math.min(pourAmountMl, pourMax)}
            onChange={(e) => setPourAmountMl(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Pour amount in milliliters"
          />
        </div>
        <label className="flex items-center gap-1.5">
          <input
            type="number"
            min={0.1}
            max={pourMax}
            step={0.1}
            value={Number(Math.min(pourAmountMl, pourMax).toFixed(1))}
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (!Number.isFinite(raw)) return;
              setPourAmountMl(Math.min(raw, pourMax));
            }}
            className={`rounded border border-lab-line/60 bg-white px-1.5 py-0.5 font-mono text-lab-ink outline-none focus:border-lab-teal focus:ring-1 focus:ring-lab-teal/30 ${
              compact ? "w-12 text-[10px]" : "w-14 text-xs"
            }`}
            aria-label="Custom pour amount"
          />
          <span
            className={`text-lab-muted ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            ml each +
          </span>
          <button
            type="button"
            onClick={() => cycleUnit()}
            className={`ml-auto rounded border border-lab-line/50 px-1 py-0.5 text-lab-muted hover:border-lab-teal/40 hover:text-lab-ink ${
              compact ? "text-[8px]" : "text-[9px]"
            }`}
            title="Cycle display units"
          >
            {unit}
          </button>
        </label>
        <button
          type="button"
          onClick={() => {
            restockAll();
            showToast({
              title: "Bottles refilled",
              detail: "Inventory stock restored.",
            });
          }}
          className={`w-full rounded border border-dashed border-lab-line/70 text-lab-muted transition hover:border-lab-teal/40 hover:text-lab-ink ${
            compact ? "py-0.5 text-[9px]" : "py-1 text-[10px]"
          }`}
        >
          Refill bottles
        </button>
      </div>
    );
  }

  function quickChemical(id: string) {
    if (!targetVessel) {
      showToast({
        title: "Need glassware first",
        detail: "Place a beaker, then tap + to pour.",
      });
      selectBrowse("equipment");
      return;
    }
    const beforeBlocked = useAuthStore.getState().isLabBlocked();
    const have = stockMl(id);
    if (have + 0.05 < pourAmountMl) {
      showToast({
        title: "Bottle empty",
        detail: `Only ${have.toFixed(1)} ml left — refill bottles.`,
      });
      return;
    }
    const ok = addChemicalToVessel(targetVessel.instanceId, id);
    if (!ok) {
      showToast(
        beforeBlocked || useAuthStore.getState().isLabBlocked()
          ? labCopy.signUpToPour
          : labCopy.pourFail,
      );
      return;
    }
    const chem = getChemical(id);
    showToast(labCopy.pourOk(chem?.formula ?? id));
  }

  function quickEquipment(id: string) {
    const eq = EQUIPMENT_BY_ID[id];
    if (!eq) return;
    if (eq.function === "heat-source") {
      if (!targetVessel) {
        showToast({
          title: "Place a vessel first",
          detail: "Then light the burner under it.",
        });
        return;
      }
      attachHeat(targetVessel.instanceId);
      showToast(labCopy.burnerOn);
      return;
    }
    if (eq.function === "cold-source") {
      if (!targetVessel) {
        showToast({
          title: "Place a vessel first",
          detail: "Then set the ice bath under it.",
        });
        return;
      }
      attachCool(targetVessel.instanceId);
      showToast(labCopy.iceBathOn);
      return;
    }
    if (eq.function === "stirring") {
      if (!targetVessel) {
        showToast({
          title: "Place a vessel first",
          detail: "Then stir its contents.",
        });
        return;
      }
      stirVessel(targetVessel.instanceId, true);
      return;
    }
    const n = vessels.length;
    placeEquipment(id, {
      x: 48 + (n % 4) * 190,
      y: 48 + Math.floor(n / 4) * 210,
    });
  }

  const list =
    browse === "chemicals"
      ? filteredChemicals
      : browse === "oils"
        ? filteredOils
        : filteredEquipment;

  const sidebarList = useMemo(
    () => list.slice(0, SIDEBAR_PREVIEW_LIMIT),
    [list],
  );
  const hasMoreInSidebar = list.length > SIDEBAR_PREVIEW_LIMIT;

  const browseTitle =
    browse === "equipment"
      ? "Equipment"
      : browse === "oils"
        ? "Oils"
        : "Chemicals";

  const browseHint =
    browse === "equipment"
      ? "Drag onto desk, or tap + to place / use."
      : browse === "oils"
        ? targetVessel
          ? `Pour oils into ${EQUIPMENT_BY_ID[targetVessel.equipmentId]?.name ?? "vessel"} — adjust ml below.`
          : "Place glassware first, then pour oils."
        : targetVessel
          ? `Pour into ${EQUIPMENT_BY_ID[targetVessel.equipmentId]?.name ?? "vessel"}${
              targetVessel.contentIds.length
                ? ` · ${targetVessel.contentIds.length} inside`
                : ""
            }.`
          : "Place glassware first, then pour reactants.";

  const oilRoles = ["all", "carrier", "top", "heart", "base"];

  const searchPlaceholder =
    browse === "equipment"
      ? "Search glassware, heat, cool…"
      : browse === "oils"
        ? "Search oils…"
        : "Search name or formula…";

  function FilterChips({
    options,
    compact = false,
  }: {
    options: string[];
    compact?: boolean;
  }) {
    return (
      <div
        className={`flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          compact ? "pb-0.5" : "pb-0.5"
        }`}
      >
        {options.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full font-medium capitalize transition ${
                compact
                  ? "px-1.5 py-0.5 text-[9px]"
                  : "px-2 py-0.5 text-[10px]"
              } ${
                active
                  ? "bg-lab-teal text-lab-foam"
                  : "bg-white/80 text-lab-muted ring-1 ring-lab-line/60 hover:text-lab-ink"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          );
        })}
      </div>
    );
  }

  function InlineBrowseList() {
    if (sidebarList.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-lab-line/70 bg-white/40 px-2 py-4 text-center text-[10px] text-lab-muted">
          Nothing matched. Try another search.
        </p>
      );
    }

    if (browse === "equipment") {
      return (
        <>
          {sidebarList.map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              payload={{ type: "equipment", itemId: item.id }}
              subtitle={item.subcategory}
              onQuickAdd={() => quickEquipment(item.id)}
              hint="Place or use on active vessel"
              highlighted={highlightIds.has(item.id)}
              dragIdPrefix="browse-eq"
            />
          ))}
        </>
      );
    }

    return (
      <>
        {sidebarList.map((item) => {
          const chem = getChemical(item.id);
          const left = stockMap[item.id] ?? stockMl(item.id);
          return (
            <DraggableItem
              key={item.id}
              item={item}
              payload={{ type: "chemical", itemId: item.id }}
              subtitle={`${chem?.formula ?? item.subcategory} · ${formatAmount(item.id, left, unit)} left`}
              accentColor={chem?.color}
              onQuickAdd={() => quickChemical(item.id)}
              hint={
                browse === "oils"
                  ? "Pour oil into active vessel"
                  : "Pour into active vessel"
              }
              highlighted={highlightIds.has(item.id)}
              dragIdPrefix={browse === "oils" ? "browse-oil" : "browse-chem"}
            />
          );
        })}
      </>
    );
  }

  const expandedUi =
    mounted && expanded
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
            className="fixed inset-0 z-[300] flex flex-col justify-end md:items-stretch md:justify-stretch"
          >
            <button
              type="button"
              className="absolute inset-0 bg-lab-ink/45 md:bg-lab-ink/30"
              aria-label="Close inventory"
              onClick={() => setExpanded(false)}
            />
            <div
              className="relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-lab-line bg-lab-panel pb-[env(safe-area-inset-bottom,0px)] shadow-2xl md:max-h-none md:h-dvh md:rounded-none md:border-0 md:pb-0"
              style={{
                background:
                  "radial-gradient(ellipse at 12% 0%, rgba(196, 180, 154, 0.12), transparent 42%), var(--lab-panel)",
              }}
            >
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-lab-line md:hidden" />
            <header className="shrink-0 border-b border-lab-line/50 bg-lab-panel/90 px-3 py-2 backdrop-blur-md sm:px-4">
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-[9px] uppercase tracking-[0.18em] text-lab-muted">
                      Inventory
                    </p>
                    <h2
                      id="inventory-modal-title"
                      className="font-display text-lg leading-none tracking-tight text-lab-ink"
                    >
                      {browseTitle}
                    </h2>
                  </div>
                  <p className="mt-0.5 max-w-xl truncate text-[11px] text-lab-muted">
                    {browseHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="min-h-11 shrink-0 rounded-lg bg-lab-ink px-3 text-xs font-semibold text-lab-foam transition hover:bg-lab-ink/90 md:min-h-0 md:rounded-md md:px-2.5 md:py-1 md:text-[11px] md:font-medium"
                >
                  Done
                </button>
              </div>
            </header>

            <div className="shrink-0 border-b border-lab-line/40 bg-lab-panel/55 px-3 py-2 sm:px-4">
              <div className="mx-auto w-full max-w-5xl space-y-1.5">
                <div className="flex gap-2">
                  {(
                    [
                      ["equipment", "Equipment"],
                      ["oils", "Oils"],
                      ["chemicals", "Chemicals"],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => selectBrowse(kind)}
                      className={`min-h-11 flex-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition md:min-h-0 md:flex-none md:py-1 md:text-[11px] md:font-medium ${
                        browse === kind
                          ? kind === "oils"
                            ? "bg-lab-amber text-white"
                            : "bg-lab-ink text-lab-foam"
                          : "bg-white/80 text-lab-muted ring-1 ring-lab-line/60 hover:text-lab-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="relative block">
                  <span className="sr-only">Search</span>
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-lab-line/70 bg-white px-3 py-2.5 text-sm text-lab-ink outline-none ring-lab-teal/30 placeholder:text-lab-muted focus:ring-2 md:px-2.5 md:py-1.5 md:text-xs"
                  />
                </label>

                {browse === "chemicals" ? (
                  <FilterChips options={categories} />
                ) : null}
                {browse === "oils" ? (
                  <FilterChips options={oilRoles} />
                ) : null}

                {browse === "chemicals" || browse === "oils" ? (
                  <PourAmountControl />
                ) : null}
              </div>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4">
              <div className="mx-auto w-full max-w-5xl">
                <p className="mb-1.5 text-[10px] text-lab-muted">
                  {list.length}{" "}
                  {browse === "equipment"
                    ? "tools"
                    : browse === "oils"
                      ? "oils"
                      : "chemicals"}
                  {query.trim() ? ` matching “${query.trim()}”` : ""}
                </p>

                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-lab-line/70 bg-white/40 px-3 py-6 text-center text-[11px] text-lab-muted">
                    Nothing matched. Try another formula or clear the search.
                  </p>
                ) : browse === "chemicals" || browse === "oils" ? (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map((item) => {
                      const chem = getChemical(item.id);
                      const highlighted = highlightIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`group flex items-stretch overflow-hidden rounded-lg border bg-white/90 shadow-sm transition hover:border-lab-teal/40 hover:shadow-md ${
                            highlighted
                              ? "border-lab-amber/55 ring-1 ring-lab-amber/20"
                              : "border-lab-line/55"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => quickChemical(item.id)}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 px-2.5 py-2 text-left md:min-h-0 md:py-1"
                          >
                            <span
                              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lab-wash text-sm"
                              aria-hidden
                            >
                              {item.icon}
                              {chem?.color ? (
                                <span
                                  className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full ring-1 ring-white"
                                  style={{ background: chem.color }}
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-xs font-semibold tracking-tight text-lab-ink">
                                {chem?.formula ?? item.name}
                              </span>
                              <span className="block truncate text-[10px] leading-tight text-lab-muted">
                                {item.name} ·{" "}
                                {formatAmount(
                                  item.id,
                                  stockMap[item.id] ?? stockMl(item.id),
                                  unit,
                                )}{" "}
                                left
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            title="Pour into active vessel"
                            onClick={() => quickChemical(item.id)}
                            className="min-w-11 shrink-0 border-l border-lab-line/40 px-3 text-sm font-bold text-lab-ink transition hover:bg-lab-ink hover:text-lab-foam md:min-w-0 md:px-2 md:text-xs"
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredEquipment.map((item) => {
                      const highlighted = highlightIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => quickEquipment(item.id)}
                          className={`flex min-h-11 items-center gap-2 rounded-lg border bg-white/90 px-2.5 py-2 text-left shadow-sm transition hover:border-lab-teal/45 hover:shadow-md md:min-h-0 md:py-1.5 ${
                            highlighted
                              ? "border-lab-amber/55 ring-1 ring-lab-amber/20"
                              : "border-lab-line/55"
                          }`}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lab-wash text-base"
                            aria-hidden
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium leading-tight text-lab-ink">
                              {item.name}
                            </span>
                            <span className="block truncate text-[10px] capitalize leading-tight text-lab-muted">
                              {item.subcategory}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-md bg-lab-ink/10 px-1.5 py-0.5 text-[11px] font-semibold text-lab-ink">
                            +
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {/* Mobile right rail — one column, equal width, right edge aligned */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 px-3 md:hidden">
        <div className="ml-auto flex w-12 flex-col items-stretch gap-2">
          {onOpenChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="pointer-events-auto flex h-11 w-full items-center justify-center rounded-xl border border-lab-line/70 bg-lab-panel/95 text-[10px] font-bold tracking-wide text-lab-ink shadow-lg backdrop-blur-md"
              aria-label="Open perfume chat"
            >
              Chat
            </button>
          ) : null}
          {onOpenTutor ? (
            <button
              type="button"
              onClick={onOpenTutor}
              className="pointer-events-auto flex h-11 w-full items-center justify-center rounded-xl border border-lab-line/70 bg-lab-panel/95 text-[11px] font-bold tracking-wide text-lab-ink shadow-lg backdrop-blur-md"
              aria-label="Open lab tutor"
            >
              Eq
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openExpanded("oils")}
            className="pointer-events-auto flex h-11 w-full items-center justify-center rounded-xl border border-lab-line/70 bg-lab-panel/95 text-[10px] font-bold tracking-wide text-lab-ink shadow-lg backdrop-blur-md"
            aria-label="Open notes and oils"
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => openExpanded("equipment")}
            className="pointer-events-auto flex h-11 w-full items-center justify-center rounded-xl border border-lab-line/70 bg-lab-panel/95 text-lg font-semibold leading-none text-lab-ink shadow-lg backdrop-blur-md"
            aria-label="Open equipment"
          >
            +
          </button>
        </div>
      </div>

      {/* Collapsed grip — desktop only */}
      {!desktopOpen ? (
        <div className="relative hidden h-full w-0 shrink-0 md:block">
          <button
            type="button"
            onClick={onToggleDesktop}
            aria-label="Show inventory"
            title="Show inventory"
            className="absolute left-0 top-1/2 z-20 flex h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-lab-line/70 bg-lab-panel/95 text-lab-muted shadow-sm hover:text-lab-ink"
          >
            ›
          </button>
        </div>
      ) : null}

      {/* `hidden` + conditional `md:flex` — never show as a phone column */}
      <aside
        className={`panel-glass relative hidden w-full shrink-0 flex-col border-b border-lab-line/60 md:h-full md:max-h-none md:w-[14rem] md:border-b-0 md:border-r xl:w-[15.5rem] ${
          desktopOpen ? "md:flex" : "md:hidden"
        }`}
      >
        {onToggleDesktop ? (
          <button
            type="button"
            onClick={onToggleDesktop}
            aria-label="Hide inventory"
            title="Hide inventory"
            className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
          >
            ‹
          </button>
        ) : null}
        <div className="border-b border-lab-line/50 px-2.5 pb-2 pt-2.5">
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-lab-teal">
            Inventory
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => selectBrowse("equipment")}
              className={`flex-1 rounded-lg border px-1.5 py-1.5 text-[11px] font-medium shadow-sm transition ${
                browse === "equipment"
                  ? "border-lab-ink/20 bg-lab-ink text-lab-foam"
                  : "border-lab-line/60 bg-white/90 text-lab-ink hover:border-lab-teal/50 hover:bg-white"
              }`}
            >
              Equipment
            </button>
            <button
              type="button"
              onClick={() => selectBrowse("oils")}
              className={`flex-1 rounded-lg border px-1.5 py-1.5 text-[11px] font-medium shadow-sm transition ${
                browse === "oils"
                  ? "border-lab-amber bg-lab-amber text-white"
                  : "border-lab-amber/40 bg-lab-amber/10 text-lab-amber hover:bg-lab-amber/15"
              }`}
            >
              Oils
            </button>
            <button
              type="button"
              onClick={() => selectBrowse("chemicals")}
              className={`flex-1 rounded-lg border px-1.5 py-1.5 text-[11px] font-medium shadow-sm transition ${
                browse === "chemicals"
                  ? "border-lab-teal bg-lab-teal text-lab-foam"
                  : "border-lab-teal/35 bg-lab-teal/10 text-lab-teal hover:bg-lab-teal/15"
              }`}
            >
              Chemicals
            </button>
          </div>

          <p className="mt-2 text-[10px] leading-snug text-lab-muted">
            {browseHint}
          </p>

          {targetVessel ? (
            <p className="mt-1.5 truncate rounded-md bg-lab-teal/10 px-1.5 py-0.5 text-[10px] text-lab-teal">
              Pour target:{" "}
              {EQUIPMENT_BY_ID[targetVessel.equipmentId]?.name ?? "vessel"}
              {targetVessel.contentIds.length
                ? ` · ${targetVessel.contentIds.length} inside`
                : ""}
            </p>
          ) : null}

          {(browse === "chemicals" || browse === "oils") && (
            <PourAmountControl compact />
          )}

          {goal ? (
            <p className="mt-1.5 rounded-md border border-lab-amber/30 bg-lab-amber/10 px-1.5 py-1 text-[10px] leading-snug text-lab-ink/80">
              <span className="font-semibold text-lab-amber">For this goal:</span>{" "}
              {goal.icon} {goal.title} — highlighted items match the recipe.
            </p>
          ) : null}

          <label className="mt-1.5 block">
            <span className="sr-only">Search {browseTitle}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-lab-line/60 bg-white px-1.5 py-1 text-[10px] text-lab-ink outline-none placeholder:text-lab-muted focus:border-lab-teal focus:ring-1 focus:ring-lab-teal/30"
            />
          </label>

          {browse === "chemicals" ? (
            <div className="mt-1.5">
              <FilterChips options={categories} compact />
            </div>
          ) : null}
          {browse === "oils" ? (
            <div className="mt-1.5">
              <FilterChips options={oilRoles} compact />
            </div>
          ) : null}

          <p className="mt-1.5 text-[9px] text-lab-muted">
            Showing {Math.min(sidebarList.length, list.length)} of {list.length}{" "}
            {browse === "equipment"
              ? "tools"
              : browse === "oils"
                ? "oils"
                : "chemicals"}
          </p>
        </div>

        <div className="scroll-thin flex min-h-0 flex-1 flex-col px-2 py-1.5">
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {goal
              ? equipment
                  .filter((item) => highlightIds.has(item.id))
                  .map((item) => (
                    <DraggableItem
                      key={`goal-${item.id}`}
                      item={item}
                      payload={{ type: "equipment", itemId: item.id }}
                      subtitle={item.subcategory}
                      onQuickAdd={() => quickEquipment(item.id)}
                      hint="Needed for your goal"
                      highlighted
                      dragIdPrefix="goal-eq"
                    />
                  ))
              : null}
            {goal
              ? items
                  .filter((item) => highlightIds.has(item.id))
                  .map((item) => {
                    const chem = getChemical(item.id);
                    return (
                      <DraggableItem
                        key={`goal-chem-${item.id}`}
                        item={item}
                        payload={{ type: "chemical", itemId: item.id }}
                        subtitle={chem?.formula}
                        accentColor={chem?.color}
                        onQuickAdd={() => quickChemical(item.id)}
                        hint="Needed for your goal"
                        highlighted
                        dragIdPrefix="goal-chem"
                      />
                    );
                  })
              : null}
            <InlineBrowseList />
          </div>

          <button
            type="button"
            onClick={() => openExpanded(browse)}
            className="mt-1.5 w-full shrink-0 rounded-lg border border-lab-teal/40 bg-lab-teal/10 px-2 py-1.5 text-[11px] font-semibold text-lab-teal transition hover:border-lab-teal/60 hover:bg-lab-teal/15"
          >
            {hasMoreInSidebar
              ? `Show more ${browseTitle.toLowerCase()}…`
              : `Browse all ${browseTitle.toLowerCase()}…`}
          </button>
        </div>

        {expandedUi}
      </aside>
    </>
  );
}
