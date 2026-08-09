"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlyraMark } from "@/components/brand/AlyraMark";
import { SnippetStack } from "./CopySnippet";
import {
  COMPONENT_PROMPTS,
  FULL_BRIEFS,
  MID_BRIEFS,
  STARTER_ONELINERS,
} from "./snippets";

const TOC = [
  { href: "#overview", label: "Overview" },
  { href: "#plan-vs-build", label: "Plan vs Build" },
  { href: "#plan-vs-agent", label: "Plan vs Agent" },
  { href: "#panes", label: "Panes & mode" },
  { href: "#prompts", label: "Copyable briefs" },
  { href: "#components", label: "Component prompts" },
  { href: "#refine", label: "Refine & bridge" },
  { href: "#auth", label: "Sign in" },
  { href: "#tips", label: "Tips" },
  { href: "#troubleshoot", label: "Troubleshooting" },
] as const;

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="scroll-mt-20 font-display text-2xl text-lab-ink md:text-3xl"
    >
      {children}
    </h2>
  );
}

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
              Whole-ass docs for Alyra Labs: brief in Chat, read the Plan (with
              ₹), Build onto the wood desk. Nothing silent-pours until you say
              so.
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

      <nav
        aria-label="Guide sections"
        className="sticky top-0 z-30 border-b border-lab-line/70 bg-lab-wash/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-5 py-2.5 scrollbar-none md:px-8">
          {TOC.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-lab-muted transition hover:bg-lab-panel hover:text-lab-ink"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl space-y-14 px-5 py-12 md:px-8 md:py-16">
        <section>
          <SectionHeading id="overview">Overview</SectionHeading>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <p>
              Alyra Labs is a digital perfume chemistry desk. You compose on
              ebony wood — pour notes, stir, heat, Mix — while the Perfumer in{" "}
              <strong className="font-semibold text-lab-ink">Chat</strong> turns
              a brief into a formula Plan mapped to real Lab inventory.
            </p>
            <p>
              The India-first loop: describe a vibe (Mumbai heat, monsoon
              evenings, office AC), get a Plan with materials, %, and a{" "}
              <strong className="font-semibold text-lab-ink">₹</strong> cost
              band, then press{" "}
              <strong className="font-semibold text-lab-ink">Build</strong> when
              you are ready. The desk stays the hero; chrome stays quiet.
            </p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Open{" "}
                <Link
                  href="/lab?tab=chat"
                  className="font-medium text-lab-ink underline"
                >
                  Lab → Chat
                </Link>
                .
              </li>
              <li>Paste a brief (snippets below) and wait for the Plan.</li>
              <li>Review mapping + ₹. Refine in chat if needed.</li>
              <li>Hit Build — timed pours land on the desk with narration.</li>
              <li>Stop / Undo anytime; refine again; Build a new Plan.</li>
            </ol>
          </div>
        </section>

        <section>
          <SectionHeading id="plan-vs-build">Plan vs Build</SectionHeading>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <p>
              <strong className="font-semibold text-lab-ink">Plan</strong> is
              the default. The Perfumer proposes a formula — materials,
              percentages, Lab inventory mapping, cost in ₹ — without touching
              the desk. Read it. Argue with it in chat. Nothing pours yet.
            </p>
            <p>
              <strong className="font-semibold text-lab-ink">Build</strong> is
              your CTA. When you approve, timed pours appear on the wood with
              chat narration. You can Stop mid-queue or Undo the last Build.
              Instant Build skips the slow pour theatre when you just want the
              vessel filled.
            </p>
            <p className="rounded-xl border border-lab-line bg-lab-panel px-4 py-3 text-lab-ink">
              Rule of thumb: Plan before Build. If the brief is fuzzy, ask for a
              Plan first — then Build once the ₹ and notes look right.
            </p>
          </div>
        </section>

        <section>
          <SectionHeading id="plan-vs-agent">
            Plan vs Agent (chat mode)
          </SectionHeading>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <p>
              Below the composer you can toggle{" "}
              <strong className="font-semibold text-lab-ink">Plan | Agent</strong>
              . This is separate from the Plan panel + Build CTA above. Default
              is{" "}
              <strong className="font-semibold text-lab-ink">Agent</strong>.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-semibold text-lab-ink">Agent</strong> —
                normal chat + tools (generate, refine, catalog). Still never
                silent-pours; desk pours only when you press Build.
              </li>
              <li>
                <strong className="font-semibold text-lab-ink">Plan</strong> —
                deliberate planning: structures a readable Plan for the panel,
                no auto-Build, no desk mutations. Switch here for long briefs.
              </li>
            </ul>
            <p>
              Type more than about ten words in Agent mode and a quiet nudge
              offers to switch to Plan — dismiss anytime. While a Build queue
              is running, the chat header shows Building so you know the desk
              is busy.
            </p>
          </div>
        </section>

        <section>
          <SectionHeading id="panes">The three panes & mode toggle</SectionHeading>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <p>
              Desktop keeps the instrument layout. Phone is desk-first — side
              panels open as sheets. The top-bar mode toggle is{" "}
              <strong className="font-semibold text-lab-ink">Tutor | Chat</strong>{" "}
              only (there is no separate Lab tab). The desk is always the center
              canvas; the toggle only swaps what fills the right slot.
            </p>
            <ul className="space-y-3">
              <li>
                <span className="font-semibold text-lab-ink">
                  Left — Inventory.
                </span>{" "}
                Equipment, oils, chemicals. Collapsible and resizable on
                desktop. On phone: sheet over the desk via FAB / overflow.
              </li>
              <li>
                <span className="font-semibold text-lab-ink">Center — Desk.</span>{" "}
                The hero. Place a beaker, pour, stir, heat, cool, Mix. Never
                crowded by chrome.
              </li>
              <li>
                <span className="font-semibold text-lab-ink">
                  Right — Tutor or Chat.
                </span>{" "}
                One right slot at a time.{" "}
                <strong className="font-semibold text-lab-ink">Chat</strong>{" "}
                holds the Perfumer, Plan panel, and Build controls.{" "}
                <strong className="font-semibold text-lab-ink">Tutor</strong>{" "}
                shows reaction notes after Mix. Deep-link with{" "}
                <code className="rounded bg-lab-panel px-1 font-mono text-[11px] text-lab-ink">
                  /lab?tab=chat
                </code>{" "}
                or{" "}
                <code className="rounded bg-lab-panel px-1 font-mono text-[11px] text-lab-ink">
                  /lab?tab=tutor
                </code>
                .
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-10">
          <div>
            <SectionHeading id="prompts">
              Copyable briefs (small → large)
            </SectionHeading>
            <p className="mt-2 text-sm leading-relaxed text-lab-muted">
              Paste into Chat. Start with a one-liner; graduate to structured
              briefs when you care about format, longevity, and ₹. Each card has
              a Copy button.
            </p>
          </div>

          <SnippetStack
            title="Starter one-liners"
            intro="Fast Plans. Good for learning the Plan → Build loop."
            snippets={STARTER_ONELINERS}
          />

          <SnippetStack
            title="Mid briefs"
            intro="Add notes, solid vs EDP, longevity, and a ₹ budget."
            snippets={MID_BRIEFS}
          />

          <SnippetStack
            title="Full structured briefs"
            intro="Goal / Type / Inspiration / Constraints — component-style."
            snippets={FULL_BRIEFS}
          />
        </section>

        <section>
          <div id="components" className="scroll-mt-20">
            <SnippetStack
              title="Component-style prompts that Build"
              intro="Labeled by difficulty. Paste into Chat, wait for Plan, then hit Build when ready."
              snippets={COMPONENT_PROMPTS}
            />
          </div>
        </section>

        <section>
          <SectionHeading id="refine">Refine & bridge</SectionHeading>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <p>
              After a Build, keep talking in Chat — “brighter top,” “cut the
              musk,” “stay under ₹900.” The Plan updates; Build again when you
              like it.
            </p>
            <p>
              <strong className="font-semibold text-lab-ink">
                Send desk to Chat
              </strong>{" "}
              (overflow / builder actions) carries your current vessel blend
              into the Perfumer so you can refine what is already on the wood.
              Unmapped materials are called out honestly; we never invent Lab
              chemicals that are not in inventory.
            </p>
          </div>
        </section>

        <section>
          <SectionHeading id="auth">Sign in</SectionHeading>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-lab-muted">
            <p>
              Guests can explore the desk with a short pour limit (two chemical
              adds before the gate). Chat streaming and serious Build work need
              an account so formulas and progress stay yours.
            </p>
            <p>
              Use{" "}
              <Link href="/login" className="font-medium text-lab-ink underline">
                Log in
              </Link>{" "}
              from the ⋯ menu when you are ready. Same Firebase account across
              Lab and progress.
            </p>
          </div>
        </section>

        <section>
          <SectionHeading id="tips">Tips (India market)</SectionHeading>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-lab-muted">
            <li>
              Mention climate: Mumbai heat, Delhi winter, monsoon humidity —
              Plans respect longevity and projection.
            </li>
            <li>
              State format early:{" "}
              <em className="text-lab-ink">solid balm</em> vs{" "}
              <em className="text-lab-ink">EDP spray</em>.
            </li>
            <li>
              Give a ₹ band (e.g. under ₹800). The Plan surfaces cost against Lab
              stock.
            </li>
            <li>
              Prefer “Plan only — wait for Build” in long briefs so nothing pours
              until you approve.
            </li>
            <li>
              On phone: desk fills the viewport; open Chat from the header toggle
              / sheet when you are ready to brief.
            </li>
            <li>
              Collapse Inventory on desktop when you want a wider desk; resize
              rails — prefs persist.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading id="troubleshoot">Troubleshooting</SectionHeading>
          <dl className="mt-3 space-y-4 text-sm leading-relaxed">
            <div>
              <dt className="font-semibold text-lab-ink">
                Chat asks me to sign in
              </dt>
              <dd className="mt-1 text-lab-muted">
                Perfumer API needs auth. Log in from ⋯, then retry the message.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-lab-ink">
                Guest gate after a couple of pours
              </dt>
              <dd className="mt-1 text-lab-muted">
                Expected. Sign in to keep Mix / discoveries. Build also counts
                toward the guest action limit.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-lab-ink">
                Plan shows unmapped materials
              </dt>
              <dd className="mt-1 text-lab-muted">
                Honest callout — those notes are not in Lab stock. Ask Chat to
                remap to inventory-only, or accept fewer lines.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-lab-ink">
                Build did nothing / Stopped mid-way
              </dt>
              <dd className="mt-1 text-lab-muted">
                Check you are signed in, Inventory has the mapped oils, and a
                vessel is on the desk. Use Undo, fix the Plan, Build again.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-lab-ink">
                I only see Tutor, not Chat
              </dt>
              <dd className="mt-1 text-lab-muted">
                Flip the top-bar toggle to{" "}
                <strong className="font-semibold text-lab-ink">Chat</strong>, or
                open{" "}
                <Link
                  href="/lab?tab=chat"
                  className="font-medium text-lab-ink underline"
                >
                  /lab?tab=chat
                </Link>
                .
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-lab-ink">
                Legacy /lab?tab=lab link
              </dt>
              <dd className="mt-1 text-lab-muted">
                Lab segment was removed. That deep-link opens the desk with Chat
                selected.
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-lab-line bg-lab-panel px-5 py-6 md:px-8">
          <p className="font-display text-xl text-lab-ink">
            Ready when you are.
          </p>
          <p className="mt-1 text-sm text-lab-muted">
            Open Chat, paste a brief, hit Build when the Plan — and the ₹ —
            look right.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/lab?tab=chat"
              className="inline-flex min-h-11 items-center rounded-lg bg-lab-ink px-5 text-sm font-semibold text-lab-foam transition hover:bg-black"
            >
              Open the Lab
            </Link>
            <Link
              href="/lab"
              className="inline-flex min-h-11 items-center rounded-lg border border-lab-line px-5 text-sm font-medium text-lab-ink hover:bg-lab-wash"
            >
              Start building
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
