"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "firebase/auth";
import {
  isProfileComplete,
  type SignupProfileFields,
  type UserProfile,
} from "@/lib/firebase/profile";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  guestChemicalAdds: number;
  authGateOpen: boolean;
  /** Name/phone captured on signup — consumed when creating the Firestore profile */
  pendingSignup: SignupProfileFields | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
  setPendingSignup: (fields: SignupProfileFields | null) => void;
  takePendingSignup: () => SignupProfileFields | null;
  recordGuestChemicalAdd: () => void;
  openAuthGate: () => void;
  closeAuthGate: () => void;
  resetGuestProgress: () => void;
  isLabBlocked: () => boolean;
  isProfileComplete: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      authReady: false,
      guestChemicalAdds: 0,
      authGateOpen: false,
      pendingSignup: null,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setAuthReady: (authReady) => set({ authReady }),
      setPendingSignup: (pendingSignup) => set({ pendingSignup }),
      takePendingSignup: () => {
        const fields = get().pendingSignup;
        if (fields) set({ pendingSignup: null });
        return fields;
      },

      recordGuestChemicalAdd: () => {
        const { user } = get();
        if (user) return;
        set((s) => {
          const guestChemicalAdds = s.guestChemicalAdds + 1;
          return {
            guestChemicalAdds,
            authGateOpen: guestChemicalAdds >= 2 ? true : s.authGateOpen,
          };
        });
      },

      openAuthGate: () => set({ authGateOpen: true }),
      closeAuthGate: () => set({ authGateOpen: false }),
      resetGuestProgress: () =>
        set({ guestChemicalAdds: 0, authGateOpen: false }),

      isProfileComplete: () => isProfileComplete(get().profile),

          // Guest 2-chemical soft-cap only. Signed-in users are never blocked by
      // incomplete demographics (gender/DOB/phone) — collect those in Settings.
      isLabBlocked: () => {
        const { user, guestChemicalAdds } = get();
        if (!user) return guestChemicalAdds >= 2;
        return false;
      },
    }),
    {
      name: "chemlab-auth-guest",
      partialize: (s) => ({
        guestChemicalAdds: s.guestChemicalAdds,
      }),
    },
  ),
);

export function assertLabActionAllowed(): boolean {
  const store = useAuthStore.getState();
  if (!store.isLabBlocked()) return true;
  store.openAuthGate();
  return false;
}
