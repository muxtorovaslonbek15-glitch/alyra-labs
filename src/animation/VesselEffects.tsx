"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { EngineResult, VesselFx } from "@/types";
import { labSound } from "@/desk/labSound";
import { computeFxIntensities } from "./fxIntensity";
import { resolveGlassShape } from "./glassware/shapes";
import { useFxClock, usePrefersReducedMotion } from "./useFxClock";

/** Keep tip inside the well: smaller swing for narrow glassware. */
const STIR_SWING_DEG: Record<string, number> = {
  beaker: 12,
  flask: 6,
  "test-tube": 6,
  "graduated-cylinder": 7,
};

/**
 * Horizontal inset of the rod clip relative to the FX overlay
 * (overlay is already inset ~12% from the SVG). Matches well width.
 */
const STIR_ROD_INSET_X: Record<string, string> = {
  beaker: "16%",
  flask: "38%",
  "test-tube": "34%",
  "graduated-cylinder": "30%",
};

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
}: Props) {
  const reduced = usePrefersReducedMotion();
  const now = useFxClock(
    [
      fx?.pourAt,
      fx?.stirAt,
      fx?.shakeAt,
      fx?.mixAt,
      fx?.heatFlashAt,
      fx?.coolFlashAt,
      fx?.transferAt,
    ],
    3200,
  );

  const intensities = computeFxIntensities({
    fx,
    effects: result?.effects,
    now,
    heatAttached: Boolean(heatAttached),
    coolAttached: Boolean(coolAttached),
    boiling,
  });

  const pouring =
    intensities.pourPhase !== "idle" &&
    (fx?.transferRole !== "source" || intensities.splash > 0);
  const transferringIn =
    fx?.transferRole === "target" && intensities.pourPhase !== "idle";
  const splashOn =
    intensities.splash > 0.15 &&
    (transferringIn || Boolean(fx?.pourAt));
  const stirring = intensities.mix > 0.05 || stirLevel > 0;
  const mixing = intensities.mix > 0.2;
  const heatFlash = intensities.heat > 0.55 && Boolean(fx?.heatFlashAt);
  const coolFlash = intensities.cool > 0.55 && Boolean(fx?.coolFlashAt);
  const stirActive = Boolean(fx?.stirAt) && intensities.mix > 0.15;
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
  const solidify = intensities.solidify > 0.2;
  const melt = intensities.melt > 0.2;
  const steam = result?.effects.some((e) => e.kind === "steam");
  const crystal = result?.effects.some((e) => e.kind === "crystal");
  const overflow = result?.effects.some((e) => e.kind === "overflow");
  const forceBoil = intensities.boil > 0.25;
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
  const boilCount = forceBoil
    ? fluid3dActive
      ? 3
      : energetic
        ? 10
        : 14
    : 0;
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
  const splashColor = fx?.pourColor ?? fillColor ?? "var(--lab-glass, #8fc0b5)";
  const shapeId = resolveGlassShape(equipmentId).id;
  const stirDeg = STIR_SWING_DEG[shapeId] ?? 10;
  const stirInsetX = STIR_ROD_INSET_X[shapeId] ?? "18%";

  const frostOpacity = reduced
    ? Math.max(0.7, intensities.solidify)
    : undefined;
  const meltStatic = reduced && melt;
  const hazardStatic = reduced && hazard;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={
        {
          ["--fx-boil"]: intensities.boil,
          ["--fx-blast"]: intensities.blast,
          ["--fx-solidify"]: intensities.solidify,
          ["--fx-melt"]: intensities.melt,
          ["--fx-burn"]: intensities.burn,
          ["--fx-splash"]: intensities.splash,
        } as CSSProperties
      }
    >
      {/* Surface hit ripples — timed to stream arrival splash */}
      {splashOn || (pouring && transferringIn)
        ? [0, 1, 2, 3].map((i) => (
            <span
              key={`ripple-${fx?.pourAt ?? fx?.transferAt}-${i}`}
              className={`lab-ripple absolute left-1/2 top-[28%] -translate-x-1/2 rounded-full border-2 border-white/70 ${
                reduced ? "lab-fx-static-visible" : ""
              }`}
              style={{
                width: 16 + i * 16,
                height: 8 + i * 6,
                animationDelay: `${i * 0.1}s`,
                opacity: reduced ? 0.45 : undefined,
              }}
            />
          ))
        : null}

      {/* Pour splash droplets — bloom on receive */}
      {splashOn
        ? Array.from({ length: reduced ? 4 : 12 }).map((_, i) => (
            <span
              key={`splash-${fx?.pourAt ?? fx?.transferAt}-${i}`}
              className="lab-splash absolute rounded-full"
              style={{
                left: `${10 + i * 7}%`,
                top: `${6 + (i % 3) * 4}%`,
                width: 5 + (i % 4) * 2,
                height: 5 + (i % 4) * 2,
                background: splashColor,
                boxShadow: `0 0 6px ${splashColor}`,
                animationDelay: `${i * 0.03}s`,
                opacity: reduced ? 0.55 : undefined,
              }}
            />
          ))
        : null}

      {/* Rim drip during stream onto target */}
      {splashOn && intensities.pourPhase === "stream"
        ? [0, 1, 2].map((i) => (
            <span
              key={`drip-${i}`}
              className="lab-rim-drip absolute rounded-full"
              style={{
                left: `${58 + i * 10}%`,
                top: "2%",
                width: 4,
                height: 12,
                background: splashColor,
                animationDelay: `${0.1 + i * 0.12}s`,
              }}
            />
          ))
        : null}

      {/* Stirring rod — clipped to well so the tip never leaves the glass */}
      {stirring && (stirActive || stirLevel >= 1) ? (
        <div
          className="absolute inset-y-[6%] overflow-hidden"
          style={{ left: stirInsetX, right: stirInsetX }}
        >
          <div
            className={`lab-stir-rod absolute left-1/2 top-0 h-[88%] w-1 origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-stone-300 to-stone-500 ${
              stirActive && !reduced ? "lab-stir-rod-active" : ""
            }`}
            style={
              {
                opacity: 0.35 + stirLevel * 0.15,
                ["--stir-deg"]: `${stirDeg}deg`,
              } as CSSProperties
            }
          />
        </div>
      ) : null}

      {/* Stir vortex — stronger ring when actively stirring */}
      {stirring && (stirActive || stirLevel >= 2) ? (
        <div
          className={`lab-swirl absolute inset-4 rounded-full border-2 border-white/40 ${
            stirActive && !reduced ? "lab-swirl-active" : "lab-swirl-idle"
          }`}
          style={{
            opacity: 0.28 + stirLevel * 0.18 + intensities.mix * 0.25,
            borderWidth: stirActive ? 2.5 : 2,
          }}
        />
      ) : null}
      {/* Secondary counter-swirl for mix / shake energy */}
      {stirring && intensities.mix > 0.35 && !reduced ? (
        <div
          className="lab-swirl lab-swirl-active absolute inset-6 rounded-full border border-white/25"
          style={{
            opacity: 0.2 + intensities.mix * 0.3,
            animationDirection: "reverse",
            animationDuration: "0.9s",
          }}
        />
      ) : null}

      {/* Mix shockwave + color bloom */}
      {mixing ? (
        <>
          <div
            key={`shock-${fx?.mixAt}`}
            className="lab-shock absolute inset-2 rounded-[1rem] border-2 border-lab-foam/70"
          />
          <div
            key={`bloom-${fx?.mixAt}`}
            className="lab-color-bloom absolute inset-3 rounded-full"
            style={{
              background: `radial-gradient(circle, ${splashColor}88, transparent 70%)`,
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

      {/* Continuous boil — nucleation from bottom; capped when fluid3d active */}
      {forceBoil
        ? Array.from({ length: boilCount }).map((_, i) => (
            <span
              key={`boil-${i}`}
              className="bubble lab-boil-bubble absolute rounded-full"
              style={{
                left: `${10 + ((i * 13 + 7) % 72)}%`,
                width: 3.5 + (i % 4) * 2.8,
                height: 3.5 + (i % 4) * 2.8,
                animationDelay: `${(i * 0.08) % 1.05}s`,
                animationDuration: `${0.65 + (i % 5) * 0.14}s`,
                bottom: `${8 + (i % 3) * 5}%`,
                opacity: 0.5 + intensities.boil * 0.45,
              }}
            />
          ))
        : null}
      {forceBoil ? (
        <>
          <div
            className="lab-boil-roil absolute inset-x-[14%] top-[30%] h-3 rounded-full bg-white/25"
            style={{ opacity: 0.25 + intensities.boil * 0.55 }}
          />
          <div
            className={`lab-steam lab-boil-steam absolute inset-x-2 top-0 h-14 bg-gradient-to-t from-transparent via-white/35 to-white/55 ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{ opacity: reduced ? 0.45 : 0.4 + intensities.boil * 0.5 }}
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

      {/* Burning liquid tongues — combustion only, not plain boil */}
      {burning ? (
        <div className="absolute inset-x-[18%] bottom-[18%] top-[32%] overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={`fire-${i}`}
              className={`lab-liquid-flame absolute bottom-0 rounded-[50%_50%_40%_40%] ${
                reduced ? "lab-fx-static-visible" : ""
              }`}
              style={{
                left: `${8 + i * 18}%`,
                width: 8 + (i % 3) * 3,
                height: 16 + (i % 4) * 5,
                animationDelay: `${i * 0.11}s`,
                opacity: reduced ? 0.7 : 0.55 + intensities.burn * 0.4,
              }}
            />
          ))}
        </div>
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
        <div
          className={`lab-melt-drip absolute inset-x-[30%] top-[20%] h-10 w-2.5 rounded-full bg-amber-200/70 ${
            meltStatic ? "lab-fx-static-visible" : ""
          }`}
          style={{ opacity: meltStatic ? 0.65 : undefined }}
        />
      ) : null}

      {/* Solidify — ice front; cool bath alone is chill frost without full freeze */}
      {solidify || coolAttached ? (
        <>
          <div
            className={`lab-solidify-frost absolute inset-x-[12%] bottom-[10%] rounded-sm bg-gradient-to-t from-sky-200/85 via-sky-100/50 to-transparent shadow-[inset_0_2px_10px_rgba(255,255,255,0.6)] ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{
              height: `${18 + intensities.solidify * 52}%`,
              opacity:
                frostOpacity ??
                0.35 + intensities.solidify * 0.55 + (coolAttached ? 0.15 : 0),
              transformOrigin: "bottom center",
            }}
          />
          {/* Dendrite veins — only when actually freezing hard */}
          {!reduced && intensities.solidify > 0.45
            ? Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={`vein-${i}`}
                  className="lab-ice-vein absolute bg-gradient-to-t from-white/70 to-transparent"
                  style={{
                    left: `${18 + i * 18}%`,
                    bottom: "10%",
                    width: 1.5,
                    height: `${18 + intensities.solidify * 28 + (i % 2) * 8}%`,
                    opacity: 0.35 + intensities.solidify * 0.4,
                    transform: `rotate(${(i - 1.5) * 6}deg)`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))
            : null}
          <div
            className={`lab-frost-rim absolute inset-x-[10%] top-[28%] h-2 rounded-full bg-sky-100/70 ${
              reduced ? "lab-fx-static-visible" : ""
            }`}
            style={{ opacity: reduced ? 0.75 : 0.4 + intensities.cool * 0.4 }}
          />
          {intensities.solidify > 0.4
            ? Array.from({ length: reduced ? 3 : 7 }).map((_, i) => (
                <span
                  key={`ice-${i}`}
                  className={`lab-ice-shard absolute bg-gradient-to-br from-white to-sky-200/90 ${
                    reduced ? "lab-fx-static-visible" : ""
                  }`}
                  style={{
                    left: `${12 + i * 11}%`,
                    bottom: `${10 + (i % 3) * 6}%`,
                    width: 4 + (i % 3) * 2,
                    height: 6 + (i % 2) * 5,
                    animationDelay: `${i * 0.1}s`,
                    opacity: reduced ? 0.85 : undefined,
                  }}
                />
              ))
            : null}
        </>
      ) : null}

      {crystal
        ? Array.from({ length: reduced ? 5 : 10 }).map((_, i) => (
            <span
              key={`xtal-${i}`}
              className={`lab-crystal absolute rotate-45 bg-gradient-to-br from-white via-sky-100 to-sky-300/90 shadow-[0_0_6px_rgba(186,230,253,0.85)] ${
                reduced ? "lab-fx-static-visible" : ""
              }`}
              style={{
                left: `${12 + i * 8}%`,
                bottom: `${8 + (i % 4) * 7}%`,
                width: 6 + (i % 3) * 2,
                height: 6 + (i % 3) * 2,
                animationDelay: `${i * 0.1}s`,
                opacity: reduced ? 0.75 : undefined,
              }}
            />
          ))
        : null}

      {overflow ? (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="lab-overflow absolute inset-x-[12%] top-[10%] h-5 rounded-full"
            style={{
              background: `linear-gradient(to bottom, ${fillColor ?? "rgba(143,192,181,0.9)"}ee, ${fillColor ?? "rgba(143,192,181,0.4)"}66 55%, transparent)`,
              opacity: 0.95,
              boxShadow: `0 2px 8px ${fillColor ?? "rgba(143,192,181,0.35)"}`,
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
                background: fillColor ?? "rgba(143,192,181,0.8)",
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

      {/* Exothermic shimmer / endothermic frost — secondary to glass */}
      {heat?.intensity === "exo" || heatAttached ? (
        <div
          className={`pointer-events-none absolute inset-0 rounded-[inherit] ${
            heat?.intensity === "exo" ? "lab-heat-exo" : "lab-heat-attached"
          }`}
        />
      ) : null}
      {heat?.intensity === "exo" || heatAttached ? (
        <>
          <div className="lab-heat-haze pointer-events-none absolute inset-x-3 top-1 h-8" />
          {/* Convection shimmer bands */}
          {!reduced
            ? [0, 1, 2].map((i) => (
                <div
                  key={`convect-${i}`}
                  className="lab-heat-convection pointer-events-none absolute inset-x-[18%] rounded-full bg-gradient-to-t from-amber-200/0 via-amber-100/25 to-transparent"
                  style={{
                    bottom: `${22 + i * 14}%`,
                    height: 10,
                    animationDelay: `${i * 0.35}s`,
                    opacity: 0.35 + intensities.heat * 0.45,
                  }}
                />
              ))
            : null}
        </>
      ) : null}
      {heat?.intensity === "endo" || coolAttached ? (
        <div className="lab-heat-endo pointer-events-none absolute inset-0 rounded-[inherit]">
          <div className="lab-frost absolute inset-x-1 top-0.5 h-5 rounded-t-lg" />
        </div>
      ) : null}

      {heatFlash ? (
        <div
          key={fx?.heatFlashAt}
          className="lab-heat-ignite pointer-events-none absolute inset-x-4 bottom-0 h-12"
        />
      ) : null}

      {coolFlash ? (
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

      {/* Sparkles on successful mix */}
      {(mixing && result?.ok) || sparkleFx
        ? Array.from({ length: 8 }).map((_, i) => (
            <span
              key={`sp-${i}`}
              className="lab-spark absolute h-1.5 w-1.5 rounded-full bg-amber-200"
              style={{
                left: `${12 + i * 10}%`,
                top: `${20 + (i % 4) * 12}%`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))
        : null}
    </div>
  );
}
