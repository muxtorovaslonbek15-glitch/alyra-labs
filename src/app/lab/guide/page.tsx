"use client";

import Link from "next/link";
import { AlyraMark } from "@/components/brand/AlyraMark";
import { DemoCard } from "./DemoCard";
import { DEMOS, type DemoLevel } from "./demos";

const TOC = [
  { href: "#how", label: "How it works" },
  { href: "#tiny", label: "Tiny prompts" },
  { href: "#bigger", label: "Bigger wins" },
  { href: "#full", label: "Full atelier" },
  { href: "#tips", label: "Quick tips" },
] as const;

const LEVEL_IDS: Record<DemoLevel, string> = {
  Tiny: "tiny",
  Bigger: "bigger",
  "Full atelier": "full",
};

const LEVEL_INTRO: Record<DemoLevel, { title: string; blurb: string }> = {
  Tiny: {
    title: "Tiny prompts",
    blurb: "One line in. A clean Plan out. Perfect first win.",
  },
  Bigger: {
    title: "Bigger wins",
    blurb:
      "Longevity, solid vs spray, Build on the desk, refine diffs, even a chem solve.",
  },
  "Full atelier": {
    title: "Full atelier",
    blurb:
      "Component-style briefs. Production-ready Plans with mapping and ₹.",
  },
};

function CtaRow({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Link
        href="/lab"
        className={
          dark
            ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-lab-foam px-5 text-sm font-semibold text-lab-ink transition hover:bg-white"
            : "inline-flex min-h-11 items-center justify-center rounded-xl bg-lab-ink px-5 text-sm font-semibold text-lab-foam transition hover:bg-black"
        }
      >
        Open Lab
      </Link>
      <Link
        href="/lab?audience=composer&tab=chat"
        className={
          dark
            ? "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-5 text-sm font-semibold text-lab-foam transition hover:bg-white/10"
            : "inline-flex min-h-11 items-center justify-center rounded-xl border border-lab-line bg-white px-5 text-sm font-semibold text-lab-ink transition hover:bg-lab-wash"
        }
      >
        Open Chat
      </Link>
    </div>
  );
}

export default function LabGuidePage() {
  const levels: DemoLevel[] = ["Tiny", "Bigger", "Full atelier"];

  return (
    <main className="min-h-dvh bg-lab-wash text-lab-ink">
      <header className="relative overflow-hidden border-b border-lab-line/60 bg-lab-ink text-lab-foam">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(196,180,154,0.28), transparent), radial-gradient(ellipse 55% 45% at 92% 78%, rgba(42,34,28,0.92), transparent)",
          }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-5 py-14 md:px-8 md:py-20">
          <AlyraMark size="md" href="/lab" onDark />
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-label text-lab-glass">
              Lab guide
            </p>
            <h1 className="max-w-2xl font-display text-4xl leading-[1.1] tracking-display md:text-5xl">
              Paste this. Get that.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-lab-foam/75 md:text-lg">
              Real prompts you can copy into Chat, plus the kind of Plan,
              formula, Build, or desk result you can expect. No long theory.
            </p>
          </div>
          <CtaRow dark />
        </div>
      </header>

      <nav
        aria-label="Guide sections"
        className="sticky top-0 z-30 border-b border-lab-line/70 bg-lab-wash/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8">
          {TOC.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-lab-muted transition hover:bg-lab-panel hover:text-lab-ink"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-4xl space-y-20 px-5 py-14 md:px-8 md:py-20">
        <section id="how" className="scroll-mt-24">
          <h2 className="font-display text-3xl tracking-display text-lab-ink md:text-4xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Copy a prompt",
                d: "Pick a card below. Hit Copy here.",
              },
              {
                n: "2",
                t: "Paste into Chat",
                d: "Open Chat (Information | Chat toggle). Send the brief.",
              },
              {
                n: "3",
                t: "Take the win",
                d: "Read the Plan + ₹. Hit Build when you want pours on the desk.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-2xl border border-lab-line bg-lab-panel px-5 py-5"
              >
                <p className="font-display text-2xl text-lab-ink">{s.n}</p>
                <p className="mt-2 text-base font-semibold text-lab-ink">
                  {s.t}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-lab-muted">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-lab-muted">
            Samples below are realistic mocks so you can see the shape of a win.
            Live Chat answers will vary with inventory and your brief.
          </p>
          <CtaRow className="mt-8" />
        </section>

        {levels.map((level) => {
          const intro = LEVEL_INTRO[level];
          const demos = DEMOS.filter((d) => d.level === level);
          return (
            <section
              key={level}
              id={LEVEL_IDS[level]}
              className="scroll-mt-24 space-y-8"
            >
              <div>
                <h2 className="font-display text-3xl tracking-display text-lab-ink md:text-4xl">
                  {intro.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-lab-muted">
                  {intro.blurb}
                </p>
              </div>
              <div className="space-y-8">
                {demos.map((demo) => (
                  <DemoCard key={demo.id} demo={demo} />
                ))}
              </div>
            </section>
          );
        })}

        <section id="tips" className="scroll-mt-24">
          <h2 className="font-display text-3xl tracking-display text-lab-ink md:text-4xl">
            Quick tips
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              {
                t: "Plan first, Build second",
                d: "Chat proposes materials, %, mapping, and ₹. Nothing pours until you press Build.",
              },
              {
                t: "Wear | Compose",
                d: "Bare /lab is the chemist bench. Wear is a companion for the compact you already own — first-run chooser, persisted preference, or /lab?audience=owner.",
              },
              {
                t: "Shortcuts on desktop",
                d: "⌘B toggles inventory. ⌘T toggles the right panel. Drag ::: on the chat header to dock Right or Bottom.",
              },
              {
                t: "Unmapped means honest",
                d: "If a note is not in Lab stock, Chat says so. Ask it to remap, or accept fewer lines.",
              },
            ].map((tip) => (
              <li
                key={tip.t}
                className="rounded-2xl border border-lab-line bg-lab-panel px-5 py-4"
              >
                <p className="text-base font-semibold text-lab-ink">{tip.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-lab-muted">
                  {tip.d}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-lab-line bg-lab-panel px-6 py-8 md:px-8">
          <p className="font-display text-2xl text-lab-ink md:text-3xl">
            Go get a win
          </p>
          <p className="mt-3 max-w-md text-base leading-relaxed text-lab-muted">
            Open Chat, paste any prompt above, hit Build when the Plan and the ₹
            look right.
          </p>
          <CtaRow className="mt-6" />
        </section>
      </div>
    </main>
  );
}
