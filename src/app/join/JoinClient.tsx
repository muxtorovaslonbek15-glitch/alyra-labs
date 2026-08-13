"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { NavChrome } from "@/components/auth/NavChrome";
import { useAuthStore } from "@/store/authStore";
import { getAuthHeaders } from "@/lib/client/authHeaders";

export default function JoinClient() {
  const params = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const [code, setCode] = useState(params.get("code") ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/join?code=${code}`)}`);
      return;
    }
    setStatus("loading");
    const headers = await getAuthHeaders();
    if (!headers) {
      setStatus("err");
      setMessage("Sign in required");
      return;
    }
    const res = await fetch("/api/join", {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus("err");
      setMessage(json.error ?? "Join failed");
      return;
    }
    setStatus("ok");
    setMessage("You're in. Open the lab.");
  }

  return (
    <div className="min-h-dvh bg-lab-wash px-4 py-8">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Link href="/lab" className="font-display text-2xl text-lab-ink">
          Alyra Labs
        </Link>
        <NavChrome />
      </div>
      <div className="mx-auto mt-10 max-w-sm">
        <h1 className="font-display text-3xl text-lab-ink">Join a class</h1>
        <p className="mt-1 text-sm text-lab-muted">
          Enter the invite code from your teacher or school.
        </p>
        {!authReady ? (
          <p className="mt-6 text-sm text-lab-muted">Loading…</p>
        ) : (
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="mt-6 space-y-3"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="INVITE"
              className="w-full rounded-lg border border-lab-line bg-white px-3 py-2 font-mono text-sm uppercase tracking-widest"
              required
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-lab-teal py-2.5 text-sm font-semibold text-white hover:bg-lab-teal/90 disabled:opacity-60"
            >
              {user ? "Join" : "Sign in to join"}
            </button>
            {status === "ok" ? (
              <p className="text-sm text-lab-teal">{message}</p>
            ) : null}
            {status === "err" ? (
              <p className="text-sm text-lab-hazard">{message}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
