"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ageFromDob,
  updateUserProfile,
  type Gender,
  type ProfileInput,
  type UserProfile,
} from "@/lib/firebase/profile";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-lab-line bg-white px-3 py-2 text-sm text-lab-ink outline-none focus-visible:border-lab-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal";

function ProfileFormFields({
  profile,
  uid,
  email,
  onboarding,
}: {
  profile: UserProfile | null;
  uid: string;
  email: string;
  onboarding: boolean;
}) {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const closeAuthGate = useAuthStore((s) => s.closeAuthGate);
  const pendingSignup = useAuthStore((s) => s.pendingSignup);
  const xp = useProgressStore((s) => s.xp);

  const seededName =
    profile?.displayName?.trim() ||
    pendingSignup?.displayName?.trim() ||
    "";
  const seededPhone =
    profile?.phone?.trim() || pendingSignup?.phone?.trim() || "";

  const [gender, setGender] = useState<Gender | "">(profile?.gender || "");
  const [dob, setDob] = useState(profile?.dob || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [pincode, setPincode] = useState(profile?.pincode || "");
  const [displayName, setDisplayName] = useState(seededName);
  const [phone, setPhone] = useState(seededPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const age = ageFromDob(dob) ?? profile?.age;
  const hasName = Boolean(seededName);
  const hasPhone = seededPhone.replace(/\D/g, "").length >= 8;
  const showNameField = !onboarding || !hasName;
  const showPhoneField = !onboarding || !hasPhone;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = (showNameField ? displayName : seededName).trim();
    const phoneValue = (showPhoneField ? phone : seededPhone).trim();
    if (!gender || !dob) {
      setError("Please fill gender and date of birth.");
      return;
    }
    if (!name) {
      setError("Enter your name.");
      return;
    }
    if (phoneValue.replace(/\D/g, "").length < 8) {
      setError("Enter a valid phone number.");
      return;
    }
    setPending(true);
    try {
      const input: ProfileInput = {
        gender,
        dob,
        address,
        pincode,
        displayName: name,
        phone: phoneValue,
      };
      const next = await updateUserProfile(uid, input);
      setProfile(next);
      closeAuthGate();
      setSaved(true);
      if (onboarding) router.replace("/lab");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-3">
      <div className="rounded-xl border border-lab-line bg-white/70 px-3 py-2">
        <p className="text-[10px] uppercase tracking-label text-lab-muted">XP</p>
        <p className="font-display text-2xl text-lab-ink">{xp}</p>
        <p className="truncate text-xs text-lab-muted">{email}</p>
        {(hasName || hasPhone) && onboarding ? (
          <p className="mt-1 truncate text-xs text-lab-ink">
            {[seededName, seededPhone].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      {showNameField ? (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
            Name
          </label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : null}

      {showPhoneField ? (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
            Phone number
          </label>
          <input
            required
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : null}

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
          Gender
        </label>
        <select
          required
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender)}
          className={inputClass}
        >
          <option value="" disabled>
            Select…
          </option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
          Date of birth
        </label>
        <input
          type="date"
          required
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={inputClass}
        />
        {age != null ? (
          <p className="mt-1 text-[11px] text-lab-muted">Age: {age}</p>
        ) : null}
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
          Address {onboarding ? "(optional)" : ""}
        </label>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
          Pincode {onboarding ? "(optional)" : ""}
        </label>
        <input
          inputMode="numeric"
          pattern="[0-9A-Za-z\\-]{0,12}"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          className={inputClass}
        />
      </div>

      {error ? (
        <p className="text-xs text-lab-hazard" role="alert">
          {error}
        </p>
      ) : null}
      {saved && !onboarding ? (
        <p className="text-xs text-lab-teal">Profile saved.</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-lab-teal px-3 py-2 text-sm font-semibold text-white hover:bg-lab-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal disabled:opacity-60"
      >
        {pending ? "Saving…" : onboarding ? "Save & enter lab" : "Save profile"}
      </button>
      {onboarding ? (
        <button
          type="button"
          onClick={() => {
            closeAuthGate();
            router.replace("/lab");
          }}
          className="w-full rounded-lg border border-lab-line bg-white px-3 py-2 text-sm font-semibold text-lab-ink hover:bg-lab-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal"
        >
          Skip for now
        </button>
      ) : null}
    </form>
  );
}

export function ProfileForm({ onboarding = false }: { onboarding?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const pendingSignup = useAuthStore((s) => s.pendingSignup);

  if (!user) {
    return (
      <p className="text-sm text-lab-muted">
        You need to log in to view your profile.
      </p>
    );
  }

  const contactKey =
    profile?.displayName ||
    profile?.phone ||
    pendingSignup?.displayName ||
    pendingSignup?.phone ||
    "pending";

  return (
    <ProfileFormFields
      key={`${user.uid}-${profile?.updatedAt ?? 0}-${contactKey}`}
      profile={profile}
      uid={user.uid}
      email={user.email ?? profile?.email ?? ""}
      onboarding={onboarding}
    />
  );
}
