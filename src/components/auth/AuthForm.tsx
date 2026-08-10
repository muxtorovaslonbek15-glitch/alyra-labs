"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatAuthError, signIn, signInWithGoogle, signUp } from "@/lib/firebase/auth";
import { track } from "@/lib/analytics/track";

type Mode = "login" | "signup";

const inputClass =
  "mt-1 w-full rounded-lg border border-lab-line bg-white px-3 py-2 text-sm text-lab-ink outline-none focus-visible:border-lab-teal";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-wider text-lab-muted"
      >
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} mt-0 pr-16`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-[11px] font-semibold text-lab-teal hover:text-lab-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-teal"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export function AuthForm({
  mode,
  redirectTo = "/lab",
}: {
  mode: Mode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onGoogle() {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogle();
      track(mode === "signup" ? "signup_complete" : "page_view", {
        provider: "google",
      });
      // Signup lands in Lab — profile/demographics are Settings/soft prompts, not a wall.
      router.replace(mode === "signup" ? "/lab" : redirectTo);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      const name = displayName.trim();
      const phoneDigits = phone.trim();
      if (!name) {
        setError("Enter your name.");
        return;
      }
      if (phoneDigits.replace(/\D/g, "").length < 8) {
        setError("Enter a valid phone number.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setPending(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, {
          displayName: displayName.trim(),
          phone: phone.trim(),
        });
        track("signup_complete");
        router.replace("/lab");
      } else {
        await signIn(email, password);
        router.replace(redirectTo);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-3">
      {mode === "signup" ? (
        <>
          <div>
            <label
              htmlFor="displayName"
              className="text-[10px] font-semibold uppercase tracking-wider text-lab-muted"
            >
              Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="text-[10px] font-semibold uppercase tracking-wider text-lab-muted"
            >
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      ) : null}
      <div>
        <label
          htmlFor="email"
          className="text-[10px] font-semibold uppercase tracking-wider text-lab-muted"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <PasswordField
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
      />
      {mode === "signup" ? (
        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
      ) : null}
      {error ? (
        <p className="text-xs text-lab-hazard" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-lab-teal px-3 py-2 text-sm font-semibold text-white transition hover:bg-lab-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "signup"
            ? "Create account"
            : "Log in"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onGoogle()}
        className="w-full rounded-lg border border-lab-line bg-white px-3 py-2 text-sm font-semibold text-lab-ink hover:bg-lab-wash disabled:opacity-60"
      >
        Continue with Google
      </button>
      <p className="text-center text-xs text-lab-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-lab-teal">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-lab-teal">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
