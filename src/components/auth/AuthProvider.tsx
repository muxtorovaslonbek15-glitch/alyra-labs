"use client";

import { useEffect } from "react";
import { getUserProfile } from "@/lib/firebase/profile";
import { LOCAL_USER, useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";

/**
 * Ro'yxatdan o'tishsiz rejim: Firebase Auth kuzatuvi yo'q.
 * Foydalanuvchi doim mahalliy (local) hisob sifatida tayyor,
 * profil esa faqat shu brauzerda saqlanadi.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    let cancelled = false;
    setUser(LOCAL_USER);

    void (async () => {
      try {
        const profile = await getUserProfile(LOCAL_USER.uid);
        if (cancelled || !profile) return;
        setProfile(profile);
        useProgressStore.getState().hydrateFromCloud({
          xp: profile.xp,
          discoveredIds: profile.discoveredIds,
          badgeIds: profile.badgeIds,
          stars: profile.stars,
          lastDailyStarAt: profile.lastDailyStarAt,
          unlockedShopItemIds: profile.unlockedShopItemIds,
          completedPerfumeIds: profile.completedPerfumeIds,
        });
      } catch {
        /* mahalliy profil yo'q — muammo emas */
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    setAuthReady(true);
    return () => {
      cancelled = true;
    };
  }, [setUser, setProfile, setAuthReady]);

  return <>{children}</>;
}
