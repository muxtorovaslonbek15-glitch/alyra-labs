"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { AppHeader } from "@/components/auth/AppHeader";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-lab-wash">
      <AppHeader />
      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <h1 className="font-display text-3xl tracking-display text-lab-ink">Log in</h1>
        <p className="mt-1 text-sm text-lab-muted">
          Continue earning XP and syncing your discoveries.
        </p>
        <div className="mt-6">
          <AuthForm mode="login" />
        </div>
      </div>
    </div>
  );
}
