"use client";

import {
  condensationCount,
  dendriteOpacity,
  frostRimOpacity,
  frostStage,
  iceFilmHeightPct,
  iceFilmOpacity,
} from "./frostVisual";
import "./heatSource.css";

/** In-well frost: beads → rime → dendrites → ice film. Never pops cubes on attach. */
export function FrostFilm({
  chill,
  ice,
  reduced,
}: {
  chill: number;
  ice: number;
  reduced: boolean;
}) {
  const stage = frostStage(chill, ice);
  if (stage === "none") return null;

  const beads = condensationCount(chill, ice, reduced);
  const rim = frostRimOpacity(chill, ice, reduced);
  const film = iceFilmOpacity(ice, reduced);
  const filmH = iceFilmHeightPct(ice);
  const dendrites = dendriteOpacity(ice);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {beads > 0
        ? Array.from({ length: beads }).map((_, i) => (
            <span
              key={`cond-${i}`}
              className="lab-condensation absolute rounded-full"
              style={{
                left: `${10 + ((i * 13 + (i % 4) * 5) % 78)}%`,
                top: `${14 + (i % 5) * 11}%`,
                width: 2.5 + (i % 3) * 1.2,
                height: 3 + (i % 2),
                opacity: 0.12 + chill * 0.45 * (1 - ice * 0.35),
                animationDelay: `${(i * 0.28) % 2.4}s`,
              }}
            />
          ))
        : null}

      <div
        className={`lab-frost-rim absolute inset-x-[8%] top-[26%] h-[3px] rounded-full ${
          reduced ? "lab-fx-static-visible" : ""
        }`}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(125,211,252,0.5), rgba(255,255,255,0.75), rgba(125,211,252,0.4), transparent)",
          opacity: rim,
        }}
      />

      {film > 0.02 ? (
        <div
          className={`lab-solidify-frost absolute inset-x-[10%] bottom-[8%] overflow-hidden rounded-sm ${
            reduced ? "lab-fx-static-visible" : "lab-frost-film"
          }`}
          style={{
            height: `${filmH}%`,
            opacity: film,
            transformOrigin: "bottom center",
            background:
              "linear-gradient(to top, rgba(224,242,254,0.78), rgba(186,230,253,0.28) 48%, transparent)",
            boxShadow: "inset 0 2px 10px rgba(255,255,255,0.35)",
          }}
        />
      ) : null}

      {dendrites > 0.02 ? (
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 h-full w-full overflow-hidden"
          aria-hidden
        >
          <g
            className="lab-frost-dendrite"
            strokeWidth="0.85"
            opacity={dendrites}
          >
            <path d="M22 118 L24 86 L18 62 M24 86 L34 74 L38 52 M24 86 L16 70" />
            <path d="M50 122 L50 78 L46 54 M50 78 L62 64 L68 44 M50 78 L40 60" />
            <path d="M78 116 L76 84 L82 58 M76 84 L66 70 L60 48 M76 84 L84 68" />
          </g>
        </svg>
      ) : null}
    </div>
  );
}
