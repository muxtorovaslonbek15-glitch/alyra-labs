"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/auth/AppHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useAuthStore } from "@/store/authStore";

function ProfilePageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const onboarding = search.get("onboarding") === "1";
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    if (authReady && !user) {
      router.replace("/login");
    }
  }, [authReady, user, router]);

  return (
    <div className="flex min-h-dvh flex-col bg-lab-wash">
      <AppHeader subtitle="Your account and lab profile." />
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="font-display text-3xl text-lab-ink">
          {onboarding ? "Personalize your lab" : "Profile"}
        </h1>
        <p className="mt-1 text-sm text-lab-muted">
          {onboarding
            ? "Optional details help Alyra tailor briefs later. You can skip and keep experimenting."
            : "Update your lab profile details."}
        </p>
        {onboarding ? (
          <p className="mt-3">
            <button
              type="button"
              onClick={() => router.replace("/lab")}
              className="text-sm font-semibold text-lab-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal"
            >
              Skip to lab
            </button>
          </p>
        ) : null}
        <div className="mt-6">
          {!authReady ? (
            <p className="text-sm text-lab-muted">Loading…</p>
          ) : (
            <ProfileForm onboarding={onboarding} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col bg-lab-wash">
          <AppHeader />
          <div className="flex flex-1 items-center justify-center text-sm text-lab-muted">
            Loading profile…
          </div>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
