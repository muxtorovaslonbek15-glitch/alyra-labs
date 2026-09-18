"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  isProfileComplete,
  type SignupProfileFields,
  type UserProfile,
} from "@/lib/firebase/profile";

/**
 * Ro'yxatdan o'tish (registration) tizimi olib tashlandi.
 * Sayt hammaga ochiq: har bir brauzer uchun doimiy "local" foydalanuvchi bor,
 * shuning uchun barcha `if (!user)` tekshiruvlari o'tadi va hech qanday
 * auth gate / guest cap ishlamaydi.
 */
export interface LocalUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const LOCAL_USER: LocalUser = {
  uid: "local",
  email: null,
  displayName: "Guest",
};

interface AuthState {
  user: LocalUser | null;
  profile: UserProfile | null;
  authReady: boolean;
  guestChemicalAdds: number;
  authGateOpen: boolean;
  /** Eski API bilan moslik uchun saqlangan (endi ishlatilmaydi). */
  pendingSignup: SignupProfileFields | null;
  setUser: (user: LocalUser | null) => void;
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
      user: LOCAL_USER,
      profile: null,
      authReady: true,
      guestChemicalAdds: 0,
      authGateOpen: false,
      pendingSignup: null,

      setUser: (user) => set({ user: user ?? LOCAL_USER }),
      setProfile: (profile) => set({ profile }),
      setAuthReady: (authReady) => set({ authReady }),
      setPendingSignup: (pendingSignup) => set({ pendingSignup }),
      takePendingSignup: () => {
        const fields = get().pendingSignup;
        if (fields) set({ pendingSignup: null });
        return fields;
      },

      /** Guest limiti yo'q — hech narsa sanalmaydi. */
      recordGuestChemicalAdd: () => {},

      /** Auth gate butunlay o'chirilgan. */
      openAuthGate: () => {},
      closeAuthGate: () => set({ authGateOpen: false }),
      resetGuestProgress: () =>
        set({ guestChemicalAdds: 0, authGateOpen: false }),

      isProfileComplete: () => isProfileComplete(get().profile),

      /** Laboratoriya hech qachon bloklanmaydi. */
      isLabBlocked: () => false,
    }),
    {
      name: "chemlab-auth-guest",
      partialize: () => ({}),
    },
  ),
);

/** Har doim ruxsat — hech qanday ro'yxatdan o'tish talab qilinmaydi. */
export function assertLabActionAllowed(): boolean {
  return true;
}
