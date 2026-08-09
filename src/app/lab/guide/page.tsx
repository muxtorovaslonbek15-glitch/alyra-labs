"use client";

import Link from "next/link";
import { AlyraMark } from "@/components/brand/AlyraMark";

export default function LabGuidePage() {
  return (
    <main className="min-h-dvh bg-lab-wash text-lab-ink">
      <div className="relative overflow-hidden border-b border-lab-line/60 bg-lab-ink text-lab-foam">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(196,180,154,0.25), transparent), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(42,34,28,0.9), transparent)",
          }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-5 py-12 md:px-8 md:py-16">
          <AlyraMark size="md" href="/lab" onDark />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lab-glass">
              Perfume Builder
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight md:text-5xl">
              How the Lab works
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-lab-foam/75 md:text-base">
              One atelier surface: brief in Chat, read the Plan, Build onto the
              wood desk. Nothing silent-pours until you say so.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/lab?tab=chat"
              className="inline-flex min-h-11 items-center rounded-lg bg-lab-foam px-5 text-sm font-semibold text-lab-ink transition hover:bg-white"
            >
              Open the Lab
            </Link>
            <Link
              href="/lab"
              className="inline-flex min-h-11 items-center rounded-lg border border-white/25 px-5 text-sm font-medium text-lab-foam/90 hover:bg-white/10"
            >
              Start building
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-12 px-5 py-12 md:px-8 md:py-16">
        <section>
          <h2 className="font-display text-2xl text-lab-ink">Plan vs Build</h2>
          <p className="mt-2 text-sm leading-relaxed text-lab-muted">
            <strong className="font-semibold text-lab-ink">Plan</strong> is the
            default. The Perfumer proposes a formula — materials, %, mapping to
            Lab inventory, cost in ₹ — without touching the desk.{" "}
            <strong className="font-semibold text-lab-ink">Build</strong> is your
            CTA: timed pours appear on the wood with chat narration. Stop or Undo
            anytime.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-lab-ink">The three panes</h2>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <li>
              <span className="font-semibold text-lab-ink">Left — Inventory.</span>{" "}
              Equipment, oils, chemicals. Collapsible and resizable on desktop.
              On phone: sheet over the desk.
            </li>
            <li>
              <span className="font-semibold text-lab-ink">Center — Desk.</span>{" "}
              The hero. Pour, stir, heat, Mix. Never crowded by chrome.
            </li>
            <li>
              <span className="font-semibold text-lab-ink">Right — Chat / Tutor.</span>{" "}
              Mode toggle in the top bar. Chat holds Perfumer + Plan; Tutor shows
              reaction notes. One right slot at a time.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-lab-ink">Refine & bridge</h2>
          <p className="mt-2 text-sm leading-relaxed text-lab-muted">
            After a Build, refine in chat — the Plan updates.{" "}
            <em>Send desk to Chat</em> carries your current vessel blend into the
            Perfumer. Unmapped materials are called out honestly; we never invent
            Lab chemicals.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-lab-ink">Sign in</h2>
          <p className="mt-2 text-sm leading-relaxed text-lab-muted">
            Guests can explore the desk with a short pour limit. Chat and Build
            need an account so formulas and progress stay yours. Use{" "}
            <Link href="/login" className="font-medium text-lab-ink underline">
              Log in
            </Link>{" "}
            from the ⋯ menu when you&apos;re ready.
          </p>
        </section>

        <section className="rounded-2xl border border-lab-line bg-lab-panel px-5 py-6 md:px-8">
          <p className="font-display text-xl text-lab-ink">
            Ready when you are.
          </p>
          <p className="mt-1 text-sm text-lab-muted">
            Open Chat, brief a vibe, hit Build when the Plan looks right.
          </p>
          <Link
            href="/lab?tab=chat"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-lab-ink px-5 text-sm font-semibold text-lab-foam transition hover:bg-black"
          >
            Open the Lab
          </Link>
        </section>
      </div>
    </main>
  );
}
