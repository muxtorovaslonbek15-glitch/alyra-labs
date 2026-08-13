"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { AlyraMark } from "@/components/brand/AlyraMark";

const BELOW = [
  {
    title: "Perfume Atelier",
    body: "Top, heart, and base notes on warm wood. Build citrus to oud, remix, and keep what you invent — the same craft behind Alyra solid perfume.",
  },
  {
    title: "Quiet permanence",
    body: "Compose with precision and restraint. Formulas that evolve rather than announce — scent as authorship, written on skin.",
  },
  {
    title: "Invention shelf",
    body: "Save formulas, compare versions, share a card. Your desk becomes a collection of signatures.",
  },
] as const;

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const router = useRouter();

  useEffect(() => {
    if (authReady && user) {
      router.replace("/lab");
    }
  }, [authReady, user, router]);

  return (
    <div className="min-h-dvh bg-lab-ink text-lab-foam">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <AlyraMark size="sm" href="/" onDark showWordmark wordmarkClassName="text-xl sm:text-2xl" />
        <nav className="flex items-center gap-1 text-sm">
          <a
            href="https://www.alyra.in/"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 font-medium text-lab-foam/70 transition hover:text-lab-foam"
          >
            Shop Alyra
          </a>
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 font-medium text-lab-foam/70 transition hover:text-lab-foam"
          >
            Log in
          </Link>
          <a
            href="#waitlist"
            className="rounded-md bg-white px-3 py-1.5 font-semibold text-lab-ink transition hover:bg-lab-foam"
          >
            Waitlist
          </a>
        </nav>
      </header>

      {/* Hero: brand-first — angel mark + Alyra Labs, one line, CTAs, full-bleed plane */}
      <section className="landing-hero relative flex min-h-dvh flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0a0a]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 70% 40%, rgba(196,180,154,0.35), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.08), transparent 45%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-transparent to-black/40"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-start px-5 pt-20 sm:px-8">
          <div className="landing-rise">
            <Image
              src="/alyra-logo.png"
              alt="Alyra Labs"
              width={120}
              height={120}
              priority
              className="h-20 w-20 sm:h-[7.5rem] sm:w-[7.5rem]"
            />
          </div>
          <h1 className="landing-rise landing-rise-delay mt-6 font-display text-5xl font-semibold leading-[0.95] tracking-display text-white sm:text-7xl md:text-8xl">
            Alyra Labs
          </h1>
          <p className="landing-rise landing-rise-delay-2 mt-5 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
            Compose fine fragrance on a chemistry desk — the atelier behind{" "}
            <a
              href="https://www.alyra.in/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-white/30 underline-offset-4 transition hover:decoration-white/70"
            >
              Alyra
            </a>{" "}
            solid perfume.
          </p>
          <div className="landing-rise landing-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#waitlist"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-lab-ink shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition hover:bg-lab-foam"
            >
              Join the waitlist
            </a>
            <Link
              href="/lab"
              className="rounded-md border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/55 hover:bg-white/15"
            >
              Open the atelier
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-lab-foam/10 bg-lab-wash px-5 py-20 text-lab-ink sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-14 sm:gap-16 md:grid-cols-3 md:gap-10">
          {BELOW.map((s) => (
            <div key={s.title}>
              <h2 className="font-display text-2xl leading-tight tracking-display sm:text-3xl">
                {s.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-lab-muted sm:text-[15px]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="waitlist"
        className="relative overflow-hidden bg-[#121212] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 0%, rgba(196,180,154,0.2), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-lg">
          <h2 className="font-display text-4xl tracking-display text-lab-foam sm:text-5xl">
            Get early access
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-lab-foam/75 sm:text-base">
            The atelier is free to explore now. Waitlist members get{" "}
            <span className="text-lab-glass">10% off Premium</span> when it
            opens.
          </p>
          <div className="mt-8 [&_input]:border-lab-foam/20 [&_input]:bg-lab-ink/40 [&_input]:text-lab-foam [&_input]:placeholder:text-lab-foam/40 [&_label]:text-lab-foam/55">
            <WaitlistForm intent="premium" />
          </div>
          <p className="mt-8 text-sm text-lab-foam/55">
            Already in?{" "}
            <Link href="/login" className="font-semibold text-lab-glass">
              Log in
            </Link>
            {" · "}
            <Link href="/lab" className="font-semibold text-lab-glass">
              Open the atelier
            </Link>
          </p>
        </div>
      </section>

      <footer className="bg-lab-ink px-5 py-8 text-center text-[11px] text-lab-foam/40">
        Alyra Labs · compose scent.{" "}
        <a
          href="https://github.com/Ghost-ops721/alyra-labs"
          className="text-lab-foam/55 underline-offset-2 hover:text-lab-foam hover:underline"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open Source
        </a>
        {" · "}
        Maintained by Neil Carnac.{" "}
        <a
          href="https://www.alyra.in/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/20 underline-offset-2 hover:text-lab-foam/70"
        >
          alyra.in
        </a>
      </footer>
    </div>
  );
}
