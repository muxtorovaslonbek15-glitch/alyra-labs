"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  FormulaDiff,
  FormulaLine,
  LabBridgeFormula,
  StructuredPayload,
} from "./types";
import { buildLabBridgeFromStructured, storeLabBridge } from "./labBridge";
import {
  chassisFromStructured,
  isSolidIntent,
} from "./solidDetect";
import { celebrateChatAchievement } from "./chatAchievements";
import { SeeTheCraft } from "@/wear/WearReplyCard";
import { stripCostCopy } from "./hideCost";

function AccordionRow({
  label,
  notes,
}: {
  label: string;
  notes?: string[];
}) {
  if (!notes?.length) return null;
  return (
    <div className="flex gap-3 text-sm">
      <p className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-label text-lab-muted">
        {label}
      </p>
      <p className="font-mono text-[12px] leading-relaxed text-lab-ink/85">
        {notes.join(" · ")}
      </p>
    </div>
  );
}

export function FormulaCard({
  structured,
  sections,
  onBuild,
  hideLabCta,
  presentation = "composer",
}: {
  structured?: StructuredPayload;
  sections?: {
    accord?: string;
    formula?: string;
    explanation?: string;
    improvements?: string;
  };
  /** When set (Lab shell), primary CTA is Build — no route hop. */
  onBuild?: (bridge: LabBridgeFormula) => void;
  /** Shell shows PlanPanel Build — hide duplicate CTA on the card. */
  hideLabCta?: boolean;
  /** Wear parks % / IFRA behind See the craft. Craft = accordion body only. */
  presentation?: "composer" | "wear" | "craft";
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [mapNote, setMapNote] = useState<string | null>(null);

  const gen = structured?.formula;
  const lines: FormulaLine[] = gen?.formula || [];
  const accord = gen?.accord;
  const dupe = structured?.dupe;
  const diff: FormulaDiff | null | undefined =
    structured?.formulaDiff ||
    (gen as { formulaDiff?: FormulaDiff } | undefined)?.formulaDiff;
  const brief = structured?.brief;
  const bridge =
    structured?.lab_bridge || buildLabBridgeFromStructured(structured);
  const canOpenLab = Boolean(bridge?.lines?.some((l) => l.labChemicalId));
  const solid = isSolidIntent({ bridge, structured });
  const chassis =
    chassisFromStructured(structured) ||
    (bridge
      ? {
          waxPercent: bridge.solidChassis?.waxPercent ?? 0,
          oilPercent: bridge.solidChassis?.oilPercent ?? 0,
          fragranceLoadPercent:
            bridge.solidChassis?.fragranceLoadPercent ?? 0,
        }
      : null);
  const showChassis =
    solid &&
    chassis &&
    chassis.waxPercent + chassis.oilPercent + chassis.fragranceLoadPercent > 0;

  const india = structured?.indiaContext;
  const wearGoals = structured?.wearGoals;
  const hasWearHero = Boolean(
    accord ||
      sections?.accord ||
      wearGoals ||
      india?.wearAdvice ||
      india?.occasion ||
      india?.climate ||
      brief?.occasion ||
      brief?.goal,
  );
  const wearMode = presentation === "wear";
  const craftOnly = presentation === "craft";

  if (!lines.length && !sections?.formula && !sections?.accord && !hasWearHero) {
    return null;
  }

  function resolveBridge(): LabBridgeFormula | null {
    return structured?.lab_bridge || buildLabBridgeFromStructured(structured);
  }

  function openInLab() {
    const payload = resolveBridge();
    if (!payload) {
      setMapNote("No formula lines to place on the desk.");
      return;
    }
    const mapped = payload.mappingReport?.mappedCount ?? 0;
    if (mapped === 0) {
      setMapNote(
        "None of these materials are in Lab inventory yet. Expand Lab fragrance stock in a later pass.",
      );
      return;
    }
    if (onBuild) {
      onBuild(payload);
      celebrateChatAchievement("open_in_lab", {
        detail: payload.title || undefined,
      });
      return;
    }
    setOpening(true);
    storeLabBridge(payload);
    celebrateChatAchievement("open_in_lab", {
      detail: payload.title || undefined,
    });
    const unmapped = payload.mappingReport?.unmappedCount ?? 0;
    if (unmapped > 0) {
      const ids = (payload.mappingReport?.unmappedIds || []).slice(0, 8).join(", ");
      setMapNote(
        `Placing ${mapped} of ${mapped + unmapped} materials. Not in Lab yet: ${ids}${
          (payload.mappingReport?.unmappedIds?.length || 0) > 8 ? "…" : ""
        }`,
      );
    } else {
      setMapNote(null);
    }
    // Deep-link: Lab opens Chat + planning. Lock, then Build. Instant via Apply in Plan.
    router.push("/lab?bridge=1&tab=chat");
  }

  const wearHero = (
    <>
      {india?.wearAdvice || india?.occasion || india?.climate || wearGoals ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Wear
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/90">
            {[
              india?.climate,
              india?.occasion || brief?.occasion,
              india?.wearAdvice,
              wearGoals?.longevityHours
                ? `${wearGoals.longevityHours}+ hours`
                : null,
              wearGoals?.projection,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : null}
      {accord ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Notes
          </p>
          <AccordionRow label="Brightness" notes={accord.top} />
          <AccordionRow label="Heart" notes={accord.heart} />
          <AccordionRow label="Skin" notes={accord.base} />
        </div>
      ) : sections?.accord ? (
        <Section title="Notes" body={sections.accord} />
      ) : null}
    </>
  );

  const craftBody = (
    <>
      {brief?.name ? (
        <p className="font-display text-xl leading-snug tracking-display text-lab-ink">
          {brief.name}
        </p>
      ) : null}

      {dupe?.disclaimer ? (
        <p className="text-[12px] leading-relaxed text-lab-muted">
          {dupe.disclaimer}
        </p>
      ) : null}

      {!wearMode && (brief?.goal || brief?.constraints?.longevityHours) ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Brief
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/85">
            {[
              brief?.name,
              brief?.type,
              brief?.goal,
              brief?.constraints?.longevityHours
                ? `${brief.constraints.longevityHours}+ hours`
                : null,
              brief?.constraints?.projection
                ? `${brief.constraints.projection} projection`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : null}

      {!wearMode && accord ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Accord
          </p>
          <AccordionRow label="Top" notes={accord.top} />
          <AccordionRow label="Heart" notes={accord.heart} />
          <AccordionRow label="Base" notes={accord.base} />
        </div>
      ) : !wearMode && sections?.accord ? (
        <Section title="Accord" body={sections.accord} />
      ) : null}

      {diff?.changes?.length ? <DiffView diff={diff} /> : null}

      {showChassis && chassis ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Chassis
          </p>
          <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-lab-ink/90">
            wax {Math.round(chassis.waxPercent)} · oil{" "}
            {Math.round(chassis.oilPercent)} · FO{" "}
            {Math.round(chassis.fragranceLoadPercent)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-lab-muted">
            State set · matte · alcohol-free
            <span className="mx-1.5 text-lab-line">·</span>
            Wear close · reapply from tin
          </p>
        </div>
      ) : null}

      {lines.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Formula
          </p>
          <ul className="mt-2 space-y-1.5">
            {lines.map((line) => (
              <li
                key={`${line.id}-${line.percent}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-lab-ink">
                  {line.name}
                  {line.role ? (
                    <span className="ml-1.5 text-[10px] uppercase text-lab-muted">
                      {line.role}
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-[13px] text-lab-ink/90">
                  {line.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : sections?.formula ? (
        <Section title="Formula" body={sections.formula} mono />
      ) : null}

      {sections?.explanation ? (
        <Section title="Explanation" body={sections.explanation} />
      ) : gen?.explanation ? (
        <Section title="Explanation" body={gen.explanation} />
      ) : null}

      {sections?.improvements ? (
        <Section title="Improvements" body={sections.improvements} />
      ) : gen?.improvements?.length ? (
        <Section
          title="Improvements"
          body={gen.improvements.map((i) => `• ${i}`).join("\n")}
        />
      ) : null}

      {(structured?.citations || []).length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Sources
          </p>
          <ul className="mt-1.5 space-y-1">
            {structured!.citations!.slice(0, 6).map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-[11px] text-lab-muted underline decoration-lab-line underline-offset-2 hover:text-lab-ink"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lines.length && !hideLabCta && !wearMode ? (
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={openInLab}
            disabled={!canOpenLab || opening}
            className="min-h-11 w-full rounded-lg bg-lab-ink px-4 py-2.5 text-sm font-semibold text-lab-foam transition hover:bg-lab-ink/90 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:w-auto md:py-2"
          >
            {opening
              ? "Preparing…"
              : onBuild
                ? "Use in Plan"
                : solid
                  ? "Open tin on desk"
                  : "Open in Lab"}
          </button>
          {bridge?.mappingReport ? (
            <p className="text-[11px] leading-relaxed text-lab-muted">
              Lab can place {bridge.mappingReport.mappedCount} material
              {bridge.mappingReport.mappedCount === 1 ? "" : "s"}
              {bridge.mappingReport.unmappedCount > 0
                ? `; ${bridge.mappingReport.unmappedCount} not in Lab inventory yet`
                : ""}
              . Proxies are teaching stand-ins. Lock the Plan, then Build to pour
              step by step.
            </p>
          ) : null}
          {mapNote ? (
            <p className="text-[11px] leading-relaxed text-lab-amber">{mapNote}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const hasCraft =
    lines.length > 0 ||
    Boolean(sections?.formula) ||
    Boolean(sections?.improvements) ||
    Boolean(gen?.improvements?.length) ||
    Boolean(showChassis) ||
    Boolean(diff?.changes?.length);

  if (craftOnly) {
    if (!hasCraft && !lines.length && !sections?.formula) return null;
    return <div className="space-y-4">{craftBody}</div>;
  }

  return (
    <div className="mt-1 space-y-4 border-t border-lab-line/60 pt-4">
      {wearMode ? wearHero : null}
      {wearMode && hasCraft ? (
        <SeeTheCraft>{craftBody}</SeeTheCraft>
      ) : wearMode ? null : (
        craftBody
      )}
    </div>
  );
}

function DiffView({ diff }: { diff: FormulaDiff }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
        Changes
      </p>
      {diff.summary ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-lab-muted">
          {diff.summary}
        </p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {diff.changes.slice(0, 10).map((c) => {
          const sign = c.delta > 0 ? "+" : "";
          const tone =
            c.delta > 0
              ? "text-emerald-800"
              : c.delta < 0
                ? "text-lab-amber"
                : "text-lab-muted";
          return (
            <li
              key={`${c.id}-${c.before}-${c.after}`}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-lab-ink">
                {c.name}
                {c.added ? (
                  <span className="ml-1.5 text-[10px] uppercase text-lab-muted">
                    added
                  </span>
                ) : null}
                {c.removed ? (
                  <span className="ml-1.5 text-[10px] uppercase text-lab-muted">
                    removed
                  </span>
                ) : null}
              </span>
              <span className={`font-mono text-[13px] ${tone}`}>
                {sign}
                {c.delta}%
                <span className="ml-1.5 text-[11px] text-lab-muted">
                  ({c.before} → {c.after})
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Section({
  title,
  body,
  mono,
}: {
  title: string;
  body: string;
  mono?: boolean;
}) {
  const cleaned = stripCostCopy(body);
  if (!cleaned) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
        {title}
      </p>
      <p
        className={`mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-lab-ink/90 ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {cleaned}
      </p>
    </div>
  );
}

