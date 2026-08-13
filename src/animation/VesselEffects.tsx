"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { EngineResult, VesselFx } from "@/types";
import { labSound } from "@/desk/labSound";
import { computeFxIntensities } from "./fxIntensity";
import { resolveGlassShape } from "./glassware/shapes";
import { useFxClock, usePrefersReducedMotion } from "./useFxClock";
import { FrostFilm } from "./heatSource/FrostFilm";
import "./heatFx.css";
import "./heatSource/heatSource.css";

/** Keep tip inside the well: smaller swing for narrow glassware. */
const STIR_SWING_DEG: Record<string, number> = {
  beaker: 12,
  flask: 6,
  "test-tube": 5,
  "graduated-cylinder": 7,
};

/**
 * Horizontal inset of the rod clip relative to the FX overlay
 * (overlay is already inset ~8% from the SVG). Matches well width.
 */
const STIR_ROD_INSET_X: Record<string, string> = {
  beaker: "20%",
  flask: "36%",
  "test-tube": "37%",
  "graduated-cylinder": "34%",
};

const STIR_ROD_HEIGHT: Record<string, string> = {
  beaker: "80%",
  flask: "84%",
  "test-tube": "82%",
  "graduated-cylinder": "82%",
};

/** Arc period — slightly different per vessel so the loop never reads as a metronome. */
const STIR_PERIOD_S: Record<string, number> = {
  beaker: 0.88,
  flask: 0.8,
  "test-tube": 0.96,
  "graduated-cylinder": 0.86,
};

const STIR_DRIFT_PX: Record<string, number> = {
  beaker: 5,
  flask: 3,
  "test-tube": 2,
  "graduated-cylinder": 3,
};

/** Ellipse vortex sits on the liquid, not as a spinner filling the card. */
const STIR_SWIRL: Record<
  string,
  { insetX: string; top: string; height: string; scaleY: number }
> = {
  beaker: { insetX: "18%", top: "36%", height: "34%", scaleY: 0.42 },
  flask: { insetX: "22%", top: "48%", height: "36%", scaleY: 0.48 },
  "test-tube": { insetX: "36%", top: "38%", height: "28%", scaleY: 0.36 },
  "graduated-cylinder": { insetX: "32%", top: "40%", height: "30%", scaleY: 0.38 },
};

/** Sim patches stirAt every ~250ms; treat as live within two ticks. */
const STIR_LIVE_MS = 520;

interface Props {
  result?: EngineResult;
  fx?: VesselFx;
  stirLevel?: number;
  heatAttached?: boolean;
  coolAttached?: boolean;
  fillColor?: string;
  boiling?: boolean;
  equipmentId?: string;
  /** When WebGL liquid is showing, tone down CSS boil DOM bubbles. */
  fluid3dActive?: boolean;
  /** Live sim — cool/freeze must track frost/viscosity, not pop on attach. */
  simTemperature?: number;
  simFrost?: number;
  simViscosity?: number;
  /** Solid melt 0–1 — wax/tin pooling, not a water drip. */
  meltFraction?: number;
  /** Continuous Mix toggle — suppresses one-shot bloom so it cannot strobe. */
  mixActive?: boolean;
}

export function VesselEffects({
  result,
  fx,
  stirLevel = 0,
  heatAttached,
  coolAttached,
  fillColor,
  boiling = false,
  equipmentId = "beaker",
  fluid3dActive = false,
  simTemperature,
  simFrost,
  simViscosity,
  meltFraction = 0,
  mixActive = false,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const flameGradId = `liqFlame-${useId().replace(/:/g, "")}`;
  const now = useFxClock(
    [
      fx?.pourAt,
      fx?.stirAt,
      fx?.shakeAt,
      fx?.mixAt,
      fx?.cupSetAt,
      fx?.castRevealAt,
      fx?.heatFlashAt,
      fx?.coolFlashAt,
      fx?.transferAt,
    ],
    3200,
    Boolean(
      heatAttached ||
        coolAttached ||
        boiling ||
        meltFraction > 0.06 ||
        stirLevel >= 1,
    ),
  );

  const intensities = computeFxIntensities({
    fx,
    effects: result?.effects,
    now,
    heatAttached: Boolean(heatAttached),
    coolAttached: Boolean(coolAttached),
    boiling,
    simTemperature,
    simFrost,
    simViscosity,
    meltFraction,
    mixActive,
  });

  const isTin = equipmentId === "tin";
  const stirring = intensities.mix > 0.05 || stirLevel > 0;
  const mixing = intensities.mix > 0.2;
  const mixBloomOn = !isTin && intensities.mixBloom > 0.08;
  const heatFlash = intensities.heat > 0.55 && Boolean(fx?.heatFlashAt);
  const coolFlash = intensities.cool > 0.55 && Boolean(fx?.coolFlashAt);
  const stirLive =
    Boolean(fx?.stirAt) && now > 0 && now - (fx?.stirAt ?? 0) < STIR_LIVE_MS;
  const stirActive = stirLive || (Boolean(fx?.stirAt) && intensities.mix > 0.15);
  const blastWindow = intensities.blast > 0.12;

  const gas = result?.effects.some((e) => e.kind === "gas" || e.kind === "bubble");
  const gasIntensity =
    result?.effects.find((e) => e.kind === "gas" || e.kind === "bubble")
      ?.intensity ?? "medium";
  const ppt = result?.effects.find((e) => e.kind === "precipitate");
  const heat = result?.effects.find((e) => e.kind === "heat");
  const smoke = result?.effects.some((e) => e.kind === "smoke");
  const hazard = result?.effects.some(
    (e) =>
      e.kind === "hazard" ||
      e.kind === "blast" ||
      e.kind === "flash" ||
      e.kind === "burst",
  );
  const blast = result?.effects.some((e) => e.kind === "blast");
  const flash = result?.effects.some((e) => e.kind === "flash");
  const foam = result?.effects.some((e) => e.kind === "foam");
  const glow = result?.effects.some((e) => e.kind === "glow");
  const sparkleFx = result?.effects.some((e) => e.kind === "sparkle");
  const dirty = result?.effects.some(
    (e) => e.kind === "dirty" || e.kind === "turbid",
  );
  const layerFx = result?.effects.find((e) => e.kind === "layer");
  const melt = intensities.melt > 0.2;
  const steam = result?.effects.some((e) => e.kind === "steam");
  const crystal = result?.effects.some((e) => e.kind === "crystal");
  const overflow = result?.effects.some((e) => e.kind === "overflow");
  const iceLanguage = equipmentId !== "tin";
  const chillAmt = intensities.cool;
  const iceAmt = intensities.solidify;
  const showChill = iceLanguage && (chillAmt > 0.08 || Boolean(coolAttached));
  const showIce = iceLanguage && iceAmt > 0.12;
  const forceBoil = intensities.boil > 0.18;
  const gasVisible = Boolean(
    gas && (mixing || intensities.mix > 0.05 || forceBoil || stirLevel > 0),
  );

  // Cap DOM nodes: fewer when energetic or when WebGL owns particles
  const energetic = intensities.blast > 0.3 || intensities.boil > 0.6;
  // WebGL owns bulk bubbles; keep a few CSS surface-pops so the meniscus reads
  const bubbleCount = fluid3dActive
    ? gasVisible
      ? gasIntensity === "high"
        ? 4
        : 2
      : 0
    : gasIntensity === "high"
      ? energetic
        ? 12
        : 16
      : gasIntensity === "low"
        ? 6
        : energetic
          ? 8
          : 12;
  const boilCount =
    forceBoil && !reduced
      ? fluid3dActive
        ? intensities.boil > 0.72
          ? 3
          : intensities.boil > 0.4
            ? 2
            : 1
        : Math.round(3 + intensities.boil * 9)
      : 0;
  const heatCssGain = fluid3dActive ? 0.55 : 1;
  const showHeat =
    intensities.heat > 0.12 ||
    Boolean(heatAttached) ||
    heat?.intensity === "exo";
  const burning = intensities.burn > 0.25;

  const prevPhase = useRef(intensities.pourPhase);
  const boilPeakAt = useRef(0);
  const blastSoundAt = useRef(0);

  // Pour stream-phase hit (transfer source only); inventory pour still cues from deskStore
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = intensities.pourPhase;
    if (
      intensities.pourPhase === "stream" &&
      prev !== "stream" &&
      fx?.transferRole === "source"
    ) {
      labSound.pour();
    }
  }, [intensities.pourPhase, fx?.transferRole]);

  // Blast hit on shared mix window peak (deskStore also cues hazard on mix)
  useEffect(() => {
    if (intensities.blast < 0.85 || !fx?.mixAt) return;
    if (blastSoundAt.current === fx.mixAt) return;
    blastSoundAt.current = fx.mixAt;
    // Secondary after-beat tick only — primary hazard sound is in mixVessel
    labSound.bubble();
  }, [intensities.blast, fx?.mixAt]);

  useEffect(() => {
    if ((!gas && !forceBoil) || (!mixing && !forceBoil)) return;
    if (ppt && mixing) labSound.ppt();
    const id = window.setInterval(() => {
      if (intensities.boil > 0.78) {
        const bucket = Math.floor(now / 220);
        if (bucket !== boilPeakAt.current) {
          boilPeakAt.current = bucket;
          labSound.bubble();
          labSound.bubble();
        }
      } else {
        labSound.bubble();
      }
    }, forceBoil ? 280 : 220);
    return () => clearInterval(id);
  }, [gas, mixing, forceBoil, ppt, intensities.boil, now]);

  const smokeCount = smoke
    ? result?.effects.find((e) => e.kind === "smoke")?.intensity === "high"
      ? fluid3dActive
        ? 5
        : 10
      : fluid3dActive
        ? 3
        : 7
    : burning
      ? 3
      : 0;
  const dramaKey = fx?.mixAt ?? fx?.shakeAt ?? fx?.heatFlashAt ?? 0;
  const pptColor =
    ppt?.value && ppt.value !== "transparent" ? ppt.value : "#c4b5a0";
  const splashColor = fx?.pourColor ?? fillColor ?? "var(--lab-glass, #c4b49a)";
  const shapeId = resolveGlassShape(equipmentId).id;
  const stirDegFull = STIR_SWING_DEG[shapeId] ?? 10;
  const stirDeg = reduced ? Math.max(3, Math.round(stirDegFull * 0.42)) : stirDegFull;
  const stirInsetX = STIR_ROD_INSET_X[shapeId] ?? "18%";
  const stirRodH = STIR_ROD_HEIGHT[shapeId] ?? "82%";
  const stirPeriodS = (STIR_PERIOD_S[shapeId] ?? 0.85) * (reduced ? 1.95 : 1);
  const stirDrift = (STIR_DRIFT_PX[shapeId] ?? 4) * (reduced ? 0.4 : 1);
  const stirSwirl = STIR_SWIRL[shapeId] ?? STIR_SWIRL.beaker;

  const meltStatic = reduced && melt;
  const hazardStatic = reduced && hazard;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={
        {
          ["--fx-boil"]: intensities.boil,
          ["--fx-blast"]: intensities.blast,
          ["--fx-solidify"]: intensities.solidify,
          ["--fx-cool"]: intensities.cool,
          ["--fx-melt"]: intensities.melt,
          ["--fx-heat"]: intensities.heat,
          ["--fx-burn"]: intensities.burn,
          ["--fx-splash"]: intensities.splash,
        } as CSSProperties
      }
    >
      {/* Pour splash lives on PourStream (SVG meniscus + rings), not CSS droplets */}

      {/* Stirring rod — clipped to well so the tip never leaves the glass */}
      {stirring && (stirActive || stirLevel >= 1) ? (
        <div
          className="absolute inset-y-[6%] overflow-hidden"
          style={{ left: stirInsetX, right: stirInsetX }}
        >
          <div
            className={`lab-stir-rod absolute left-1/2 top-0 w-[3px] origin-top -translate-x-1/2 rounded-full ${
              stirActive ? "lab-stir-rod-active" : ""
            }`}
            style={
              {
                height: stirRodH,
                opacity: stirActive ? 0.72 : 0.38 + stirLevel * 0.08,
                ["--stir-deg"]: `${stirDeg}deg`,
                ["--stir-period"]: `${stirPeriodS}s`,
                ["--stir-drift"]: `${stirDrift}px`,
              } as CSSProperties
            }
          />
          {stirActive ? (
            <div
              className="lab-stir-wake absolute left-1/2 rounded-full"
              style={
                {
                  top: "58%",
                  width: "72%",
                  height: "18%",
                  ["--stir-period"]: `${stirPeriodS}s`,
                  ["--stir-drift"]: `${stirDrift}px`,
                } as CSSProperties
              }
            />
          ) : null}
        </div>
      ) : null}

      {/* Stir vortex — ellipse on the liquid surface; follows the rod with lag */}
      {stirring && (stirActive || stirLevel >= 2) ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: stirSwirl.insetX,
            right: stirSwirl.insetX,
            top: stirSwirl.top,
            height: stirSwirl.height,
          }}
        >
          <div
            className={`lab-swirl absolute inset-[8%] rounded-full ${
              stirActive ? "lab-swirl-active" : "lab-swirl-idle"
            }`}
            style={
              {
                opacity: stirActive ? 0.18 : 0.1,
                ["--swirl-sy"]: stirSwirl.scaleY,
                animationDuration: stirActive
                  ? reduced
                    ? "3.4s"
                    : "1.8s"
                  : "4.2s",
                animationDelay: "0.12s",
              } as CSSProperties
            }
          />
        </div>
      ) : null}
      {/* Secondary counter-swirl only when mix energy is high */}
      {stirring && intensities.mix > 0.6 && !reduced ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: stirSwirl.insetX,
            right: stirSwirl.insetX,
            top: stirSwirl.top,
            height: stirSwirl.height,
          }}
        >
          <div
            className="lab-swirl lab-swirl-active absolute inset-[18%] rounded-full"
            style={
              {
                opacity: 0.12,
                animationDirection: "reverse",
                animationDuration: "2.2s",
                ["--swirl-sy"]: stirSwirl.scaleY,
              } as CSSProperties
            }
          />
        </div>
      ) : null}

      {/* Liquid Mix — homogenize bloom in the well. Cast uses CastMixCue. */}
      {mixBloomOn ? (
        <>
          <div
            key={`shock-${fx?.mixAt}`}
            className={`lab-mix-shock absolute inset-[8%] rounded-full border border-lab-foam/40 ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{ opacity: reduced ? 0.32 : undefined }}
          />
          <div
            key={`unify-${fx?.mixAt}`}
            className={`lab-mix-unify absolute inset-[10%] rounded-full ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{
              background: `radial-gradient(circle at 50% 58%, ${splashColor}99 0%, ${splashColor}33 44%, transparent 74%)`,
              opacity: reduced ? 0.38 : undefined,
            }}
          />
          <div
            key={`bloom-${fx?.mixAt}`}
            className={`lab-mix-bloom absolute inset-3 rounded-full ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{
              background: `radial-gradient(circle at 46% 40%, ${splashColor}55, transparent 68%)`,
              opacity: reduced ? 0.26 : undefined,
            }}
          />
        </>
      ) : null}

      {/* Reaction gas bubbles — nucleation from bottom, wobble via CSS */}
      {gasVisible
        ? Array.from({ length: bubbleCount }).map((_, i) => (
            <span
              key={`b-${i}`}
              className="bubble lab-gas-bubble absolute rounded-full"
              style={{
                left: `${8 + ((i * 17 + (i % 3) * 5) % 78)}%`,
                bottom: `${6 + (i % 4) * 3}%`,
                width: 4 + (i % 5) * 2.2,
                height: 4 + (i % 5) * 2.2,
                animationDelay: `${(i * 0.14) % 1.6}s`,
                animationDuration: `${1.15 + (i % 4) * 0.28}s`,
                opacity: reduced ? 0.5 : undefined,
              }}
            />
          ))
        : null}

      {/* Continuous boil — nucleation from heat; WebGL owns bulk when fluid3d */}
      {forceBoil
        ? Array.from({ length: boilCount }).map((_, i) => (
            <span
              key={`boil-${i}`}
              className="bubble lab-boil-bubble lab-heat-fx absolute rounded-full"
              style={{
                left: `${10 + ((i * 13 + 7) % 72)}%`,
                width: 2.8 + (i % 4) * 2.2 + intensities.boil * 1.4,
                height: 2.8 + (i % 4) * 2.2 + intensities.boil * 1.4,
                animationDelay: `${(i * 0.09) % 1.15}s`,
                animationDuration: `${Math.max(0.42, 0.95 - intensities.boil * 0.38 + (i % 5) * 0.08)}s`,
                bottom: `${6 + (i % 3) * 4}%`,
                opacity: 0.38 + intensities.boil * 0.42,
              }}
            />
          ))
        : null}
      {forceBoil && !fluid3dActive ? (
        <>
          {intensities.boil > 0.42 && !reduced ? (
            <div
              className="lab-boil-roil lab-heat-fx absolute inset-x-[14%] top-[30%] h-3 rounded-full bg-white/20"
              style={{ opacity: 0.12 + intensities.boil * 0.38 }}
            />
          ) : null}
          <div
            className={`lab-steam lab-boil-steam lab-heat-fx absolute inset-x-2 top-0 h-14 bg-gradient-to-t from-transparent via-white/28 to-white/45 ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{
              opacity: reduced
                ? 0.32
                : 0.18 + intensities.boil * 0.42,
            }}
          />
        </>
      ) : null}

      {/* Layered immiscible bands */}
      {layerFx?.value ? (
        <div className="pointer-events-none absolute inset-x-[14%] bottom-[12%] top-[35%] overflow-hidden rounded-sm">
          {layerFx.value.split(",").map((color, i, arr) => (
            <div
              key={`layer-${i}`}
              className="absolute inset-x-0"
              style={{
                bottom: `${(i / arr.length) * 100}%`,
                height: `${100 / arr.length}%`,
                background: color,
                opacity: 0.55,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Foam head — rides near the lip when overflowing */}
      {foam ? (
        <div
          className="lab-foam-head absolute inset-x-[16%] h-5 overflow-visible rounded-t-full bg-white/55"
          style={{ top: overflow ? "12%" : "28%" }}
        >
          {Array.from({ length: overflow ? 9 : 6 }).map((_, i) => (
            <span
              key={`foam-${i}`}
              className="lab-foam-bubble absolute rounded-full bg-white/80"
              style={{
                left: `${6 + i * (overflow ? 10 : 14)}%`,
                width: 5 + (i % 3),
                height: 5 + (i % 3),
                top: `${(i % 2) * 3}px`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Explosion — glass kick + debris + brief whiteout + after-beat; remount on mixAt */}
      {(blast || flash) && (blastWindow || hazard) ? (
        <div key={`blast-${dramaKey}`} className="absolute inset-0">
          <div
            className="lab-blast-whiteout absolute inset-0 rounded-[1rem] bg-white/80"
            style={{ opacity: reduced ? 0.15 : undefined }}
          />
          <div
            className="lab-blast-shock absolute -inset-2 rounded-[1.25rem]"
            style={{
              background:
                "radial-gradient(circle at 50% 55%, rgba(253,230,138,0.75) 0%, rgba(249,115,22,0.4) 40%, transparent 72%)",
              opacity: intensities.blast,
            }}
          />
          <div className="lab-blast-shock lab-blast-shock-2 absolute inset-0 rounded-[1rem] border-2 border-amber-200/80" />
          <div className="lab-flash-flare absolute inset-x-0 top-0 h-24 rounded-full bg-gradient-to-b from-amber-100 via-orange-300/70 to-transparent" />
          {Array.from({ length: reduced ? 4 : 12 }).map((_, i) => (
            <span
              key={`ember-${i}`}
              className="lab-blast-ember absolute rounded-full bg-gradient-to-t from-orange-600 to-amber-200"
              style={
                {
                  left: `${6 + i * 7}%`,
                  top: `${22 + (i % 5) * 12}%`,
                  width: 3 + (i % 3) * 2,
                  height: 3 + (i % 3) * 2,
                  boxShadow: "0 0 8px rgba(255,160,60,0.9)",
                  animationDelay: `${i * 0.03}s`,
                  ["--ember-x"]: `${(i % 2 === 0 ? -1 : 1) * (12 + (i % 5) * 8)}px`,
                } as CSSProperties
              }
            />
          ))}
          {Array.from({ length: reduced ? 3 : 8 }).map((_, i) => (
            <span
              key={`shard-${i}`}
              className="lab-blast-shard absolute bg-amber-100/90"
              style={
                {
                  left: `${20 + i * 8}%`,
                  top: `${35 + (i % 3) * 8}%`,
                  width: 2,
                  height: 8 + (i % 3) * 3,
                  animationDelay: `${0.02 + i * 0.04}s`,
                  ["--shard-rot"]: `${(i - 4) * 28}deg`,
                } as CSSProperties
              }
            />
          ))}
          {/* After-beat haze */}
          {intensities.blast > 0.15 ? (
            <div
              className="lab-blast-after absolute inset-1 rounded-[1rem] bg-amber-100/20"
              style={{ opacity: intensities.blast * 0.45 }}
            />
          ) : null}
        </div>
      ) : null}

      {result?.effects.some((e) => e.kind === "burst") &&
      (blastWindow || hazard) ? (
        <div
          key={`burst-${dramaKey}`}
          className="lab-burst-ring absolute -inset-1 rounded-full border-[3px] border-lab-hazard"
        />
      ) : null}

      {/* Burning liquid — layered cone, not oval tongues */}
      {burning ? (
        <svg
          viewBox="0 0 60 40"
          className="absolute inset-x-[20%] bottom-[14%] h-[36%] w-[60%] overflow-hidden"
          aria-hidden
        >
          <defs>
            <linearGradient id={flameGradId} x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0%" stopColor="#1e4fd8" />
              <stop offset="28%" stopColor="#b8956c" />
              <stop offset="70%" stopColor="#ffe08a" />
              <stop offset="100%" stopColor="#fff8e8" />
            </linearGradient>
          </defs>
          <g
            className={reduced ? undefined : "lab-liquid-flame-group"}
            fill={`url(#${flameGradId})`}
            opacity={reduced ? 0.55 : 0.5 + intensities.burn * 0.4}
          >
            <path d="M18 38 C14 26 15 16 18 8 C21 16 23 26 21 38 Z" />
            <path d="M30 40 C24 24 25 10 30 2 C35 10 36 24 36 40 Z" />
            <path d="M42 38 C39 26 40 16 43 9 C46 16 47 26 45 38 Z" />
          </g>
        </svg>
      ) : null}

      {glow ? (
        <div
          className="lab-glow-bloom absolute inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${heat?.value ?? "#ff8a65"}88, transparent 70%)`,
          }}
        />
      ) : null}

      {dirty ? (
        <div className="lab-dirty-haze absolute inset-3 rounded-full bg-stone-600/25 blur-sm" />
      ) : null}

      {steam && !forceBoil ? (
        <div
          className={`lab-steam absolute inset-x-3 top-0 h-14 bg-gradient-to-t from-transparent via-white/45 to-white/60 ${
            reduced ? "lab-fx-static-visible" : ""
          }`}
          style={{ opacity: reduced ? 0.4 : undefined }}
        />
      ) : null}

      {melt ? (
        <div className="lab-heat-fx pointer-events-none absolute inset-x-[14%] bottom-[10%] top-[26%] overflow-hidden">
          <div
            className={`lab-melt-pool absolute inset-x-[6%] bottom-0 rounded-[50%] ${
              meltStatic ? "lab-fx-static-visible" : ""
            }`}
            style={{
              height: `${14 + intensities.melt * 40}%`,
              background: `radial-gradient(ellipse at 50% 35%, ${fillColor ?? "rgba(196,180,154,0.85)"}cc, ${fillColor ?? "rgba(184,149,108,0.7)"}99 70%)`,
              opacity: meltStatic
                ? 0.62
                : 0.38 + intensities.melt * 0.48,
              filter: `blur(${Math.max(0.2, 1.1 - intensities.melt * 0.7)}px)`,
            }}
          />
          <div
            className="lab-melt-meniscus absolute inset-x-[18%] rounded-full"
            style={{
              bottom: `${10 + intensities.melt * 36}%`,
              height: 3,
              background:
                "linear-gradient(180deg, rgba(255,248,230,0.4), transparent)",
              opacity: 0.22 + intensities.melt * 0.45,
            }}
          />
          {!reduced
            ? [0, 1, 2].map((i) => (
                <span
                  key={`chunk-${i}`}
                  className="lab-melt-chunk absolute rounded-[2px]"
                  style={{
                    left: `${16 + i * 24}%`,
                    top: `${4 + (1 - intensities.melt) * 14}%`,
                    width: 11 - i * 1.5,
                    height: 7 - (i % 2),
                    background: fillColor ?? "#c4b49a",
                    opacity: Math.max(0, 0.72 - intensities.melt * 0.68),
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))
            : null}
          {!reduced && intensities.melt > 0.22 && intensities.melt < 0.92
            ? [0, 1].map((i) => (
                <span
                  key={`mdrip-${i}`}
                  className="lab-melt-drip absolute w-1.5 rounded-full"
                  style={{
                    left: `${30 + i * 26}%`,
                    top: "16%",
                    background: fillColor ?? "rgba(184,149,108,0.72)",
                    animationDelay: `${i * 0.32}s`,
                    opacity: 0.5,
                  }}
                />
              ))
            : null}
        </div>
      ) : null}

      {/* Cool bath: condensation → rime → dendrites. Ice only after live freeze. */}
      {showChill || showIce ? (
        <FrostFilm chill={chillAmt} ice={iceAmt} reduced={reduced} />
      ) : null}

      {crystal && iceAmt > 0.28
        ? Array.from({ length: reduced ? 3 : 5 }).map((_, i) => (
            <span
              key={`xtal-${i}`}
              className={`lab-crystal absolute bg-gradient-to-br from-white/90 to-[#bae6fd]/50 ${
                reduced ? "lab-fx-static-visible" : ""
              }`}
              style={{
                left: `${16 + i * 14}%`,
                bottom: `${10 + (i % 3) * 8}%`,
                width: 4 + (i % 2),
                height: 4 + (i % 2),
                opacity: reduced ? 0.45 : 0.2 + iceAmt * 0.35,
                borderRadius: 1,
              }}
            />
          ))
        : null}

      {overflow ? (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="lab-overflow absolute inset-x-[12%] top-[10%] h-5 rounded-full"
            style={{
              background: `linear-gradient(to bottom, ${fillColor ?? "rgba(196,180,154,0.9)"}ee, ${fillColor ?? "rgba(196,180,154,0.4)"}66 55%, transparent)`,
              opacity: 0.95,
              boxShadow: `0 2px 8px ${fillColor ?? "rgba(196,180,154,0.35)"}`,
            }}
          />
          {/* Foam beads riding the lip */}
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={`lip-foam-${i}`}
              className="lab-foam-bubble absolute rounded-full bg-white/85"
              style={{
                left: `${18 + i * 14}%`,
                top: `${9 + (i % 2)}%`,
                width: 5 + (i % 3),
                height: 5 + (i % 3),
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <span
              key={`spill-${i}`}
              className="lab-overflow-drip absolute rounded-full"
              style={{
                left: `${22 + i * 16}%`,
                top: "14%",
                width: 3.5 + (i % 2),
                height: 11 + i * 2.5,
                background: fillColor ?? "rgba(196,180,154,0.8)",
                opacity: 0.75,
                animationDelay: `${i * 0.11}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Precipitate: cloudy haze → settling flakes → bed */}
      {ppt ? (
        <>
          <div
            className={`lab-ppt-cloud absolute inset-3 rounded-full ${
              mixing ? "lab-ppt-cloud-active" : ""
            }`}
            style={{
              background: `radial-gradient(circle, ${pptColor}55, transparent 70%)`,
            }}
          />
          <div
            className="precipitate absolute inset-x-3 bottom-2 h-5 overflow-hidden rounded-sm lab-ppt-bed"
            style={{
              background: `linear-gradient(to top, ${pptColor}ee, ${pptColor}66 55%, ${pptColor}22)`,
              boxShadow: `0 0 12px ${pptColor}66`,
              animationDelay: mixing ? "0.35s" : "0s",
            }}
          >
            <div className="lab-ppt-grain absolute inset-0 opacity-50" />
          </div>
        </>
      ) : null}

      {/* Settling ppt flakes — linger after mix */}
      {ppt && mixing
        ? Array.from({ length: fluid3dActive ? 4 : 8 }).map((_, i) => (
            <span
              key={`flake-${i}`}
              className="lab-flake absolute rounded-sm"
              style={{
                left: `${14 + i * 9}%`,
                width: 4 + (i % 2),
                height: 3,
                background: pptColor,
                animationDelay: `${0.15 + i * 0.08}s`,
              }}
            />
          ))
        : null}

      {/* Heat — amber shimmer / convection. Presence, not orange fireworks. */}
      {showHeat ? (
        <div className="lab-heat-fx pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div
            className={
              heat?.intensity === "exo" ? "lab-heat-exo" : "lab-heat-well"
            }
            style={{
              opacity: (0.28 + intensities.heat * 0.5) * heatCssGain,
            }}
          />
          {!reduced && intensities.heat > 0.16 ? (
            <div
              className="lab-heat-shimmer absolute inset-x-2 top-0 h-10"
              style={{ opacity: (0.2 + intensities.heat * 0.38) * heatCssGain }}
            />
          ) : null}
          {!reduced && intensities.heat > 0.2
            ? [0, 1, 2].map((i) => (
                <div
                  key={`convect-${i}`}
                  className="lab-heat-band pointer-events-none absolute inset-x-[18%] rounded-full"
                  style={{
                    bottom: `${18 + i * 16}%`,
                    height: 7 + intensities.heat * 5,
                    animationDelay: `${i * 0.42}s`,
                    animationDuration: `${2.05 - intensities.heat * 0.5}s`,
                    opacity: (0.14 + intensities.heat * 0.26) * heatCssGain,
                  }}
                />
              ))
            : null}
        </div>
      ) : null}
      {heat?.intensity === "endo" || showChill ? (
        <div
          className="lab-heat-endo pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ opacity: 0.28 + chillAmt * 0.5 }}
        >
          <div
            className="lab-frost absolute inset-x-1 top-0.5 h-5 rounded-t-lg"
            style={{ opacity: 0.2 + chillAmt * 0.5 }}
          />
        </div>
      ) : null}

      {heatFlash ? (
        <div
          key={fx?.heatFlashAt}
          className={`lab-heat-flash lab-heat-fx pointer-events-none absolute inset-x-4 bottom-0 h-10 ${
            reduced ? "lab-fx-static-visible" : ""
          }`}
          style={{ opacity: reduced ? 0.35 : undefined }}
        />
      ) : null}

      {coolFlash && iceLanguage ? (
        <div
          key={fx?.coolFlashAt}
          className="lab-cool-flash pointer-events-none absolute inset-x-3 bottom-0 h-10"
        />
      ) : null}

      {smokeCount > 0
        ? Array.from({ length: smokeCount }).map((_, i) => (
            <div
              key={`sm-${i}`}
              className="lab-smoke absolute rounded-full bg-stone-500/40 blur-md"
              style={{
                left: `${8 + i * 10}%`,
                top: `${0 + (i % 3) * 4}%`,
                width: 28 + i * 8,
                height: 16 + i * 5,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))
        : null}

      {hazard ? (
        <div
          className={`absolute inset-0 flex items-end justify-center pb-2 ${
            hazardStatic ? "" : "lab-hazard-pulse"
          }`}
        >
          <span className="rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/95 shadow">
            Hazard
          </span>
        </div>
      ) : null}

      {/* Champagne motes on Mix — 4 max, not amber game sparks */}
      {!isTin &&
      !reduced &&
      (intensities.mixBloom > 0.22 || sparkleFx)
        ? Array.from({ length: 4 }).map((_, i) => (
            <span
              key={`mote-${fx?.mixAt ?? "sparkle"}-${i}`}
              className="lab-mix-mote absolute h-1 w-1 rounded-full"
              style={{
                left: `${22 + i * 16}%`,
                top: `${28 + (i % 2) * 14}%`,
                background: "var(--lab-glass, #c4b49a)",
                animationDelay: `${i * 0.09}s`,
              }}
            />
          ))
        : null}
    </div>
  );
}

/**
 * Solid Cast mix_hold cue — champagne wash, then cup-set owns the eye.
 * Mount on the tin card only; never sparks, never a shock ring.
 */
export function CastMixCue({
  fillColor,
  mixAt,
  intensity,
  reduced,
}: {
  fillColor?: string;
  mixAt?: number;
  intensity: number;
  reduced?: boolean;
}) {
  if (intensity < 0.05) return null;
  const tint =
    fillColor && fillColor !== "transparent" ? fillColor : "#c4b49a";
  return (
    <div className="pointer-events-none absolute inset-[14%] z-[5] overflow-visible">
      <div
        key={`cast-cue-${mixAt ?? 0}`}
        className={`absolute inset-0 rounded-full ${
          reduced ? "lab-fx-static-visible" : "lab-cast-cue"
        }`}
        style={{
          background: `radial-gradient(circle at 48% 42%, ${tint}4d 0%, rgba(196,180,154,0.28) 36%, transparent 72%)`,
          opacity: reduced ? 0.38 : undefined,
        }}
      />
    </div>
  );
}
