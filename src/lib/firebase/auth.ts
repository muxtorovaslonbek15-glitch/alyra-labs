import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth, isFirebaseConfigured } from "./client";
import {
  ensureUserProfile,
  type SignupProfileFields,
} from "./profile";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import { getAuthHeaders } from "@/lib/client/authHeaders";

export function formatAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/configuration-not-found":
        return "Auth is not ready for this domain. Try again, or refresh the page.";
      case "auth/email-already-in-use":
        return "That email is already registered. Try logging in.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a moment and try again.";
      default:
        return err.message.replace(/^Firebase:\s*/i, "").replace(/\s*\(.*\)$/, "");
    }
  }
  if (err instanceof Error) return err.message;
  return "Authentication failed";
}

export async function signUp(
  email: string,
  password: string,
  signup: SignupProfileFields,
) {
  const fields = {
    displayName: signup.displayName.trim(),
    phone: signup.phone.trim(),
  };
  // So AuthProvider's race creates the profile with name/phone
  useAuthStore.getState().setPendingSignup(fields);

  const cred = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  if (fields.displayName) {
    await updateProfile(cred.user, { displayName: fields.displayName });
  }

  const progress = useProgressStore.getState();
  const badgeIds = progress.badges.filter((b) => b.earnedAt).map((b) => b.id);
  const profile = await ensureUserProfile(
    cred.user.uid,
    cred.user.email ?? email.trim(),
    {
      xp: progress.xp,
      discoveredIds: progress.discoveredIds,
      badgeIds,
    },
    fields,
  );
  useAuthStore.getState().setPendingSignup(null);
  useAuthStore.getState().setProfile(profile);
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  return cred.user;
}

/** Google SSO — then auto-join org if email domain matches org.sso.domain */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(getFirebaseAuth(), provider);
  const email = cred.user.email;
  if (email) {
    try {
      const headers = await getAuthHeaders();
      if (headers) {
        await fetch("/api/sso/provision", {
          method: "POST",
          headers,
          body: JSON.stringify({ email, provider: "google" }),
        });
      }
    } catch {
      /* best-effort org join */
    }
  }
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(getFirebaseAuth());
}

export function subscribeAuth(callback: (user: User | null) => void): Unsubscribe {
  // Soft-fail when Firebase env is missing so Perfumer / guest Lab still load locally.
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
