"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm({
  intent = "premium",
  compact = false,
}: {
  intent?: "premium" | "launch";
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          intent,
        }),
      });
      const json = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setStatus("err");
        setMessage(json.error ?? "Something went wrong");
        return;
      }
      setStatus("ok");
      setMessage(
        "You’re on the list — we’ll email your 10% off Premium code when it opens.",
      );
      setEmail("");
      setName("");
    } catch {
      setStatus("err");
      setMessage("Network error — try again");
    }
  }

  if (status === "ok") {
    return (
      <p
        className={`rounded-xl border border-lab-teal/30 bg-lab-panel/90 px-4 py-3 text-sm text-lab-ink ${
          compact ? "" : "max-w-md"
        }`}
        role="status"
      >
        {message}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={`flex flex-col gap-2 ${compact ? "sm:flex-row sm:items-end" : "max-w-md"}`}
    >
      {!compact ? (
        <label className="block text-[11px] font-semibold uppercase tracking-label text-lab-muted">
          Name (optional)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-lab-line bg-white/90 px-3 py-2 text-sm text-lab-ink"
            autoComplete="name"
          />
        </label>
      ) : null}
      <label className="block min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-label text-lab-muted">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="mt-1 w-full rounded-lg border border-lab-line bg-white/90 px-3 py-2 text-sm text-lab-ink"
          autoComplete="email"
        />
      </label>
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-lab-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-lab-teal/90 disabled:opacity-60"
      >
        {status === "loading" ? "Joining…" : "Join the waitlist"}
      </button>
      {status === "err" ? (
        <p className="text-sm text-lab-hazard sm:col-span-full" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
