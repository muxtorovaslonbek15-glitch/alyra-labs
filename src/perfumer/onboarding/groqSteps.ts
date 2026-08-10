/** Groq BYOK onboarding / rotate steps with illustrative screenshots */

export type GroqOnboardingMode = "onboard" | "rotate";

export interface GroqGuideStep {
  id: string;
  title: string;
  body: string;
  /** Public path under /onboarding/groq/ */
  image: string;
  imageAlt: string;
  /** Optional external link for this step */
  href?: string;
  hrefLabel?: string;
  /** When true, show the paste/save form on this step */
  pasteForm?: boolean;
  /** Rotate-only step */
  rotateOnly?: boolean;
  /** Onboard-only (skip in rotate after delete) */
  onboardOnly?: boolean;
}

/** Captions note images are illustrative; click paths match console.groq.com */
export const GROQ_GUIDE_DISCLAIMER =
  "Screenshots are illustrative mockups of the Groq Console path — labels and layout may differ slightly from the live site.";

export const GROQ_CONSOLE_KEYS_URL = "https://console.groq.com/keys";
export const GROQ_CONSOLE_URL = "https://console.groq.com";

export const GROQ_ONBOARD_STEPS: GroqGuideStep[] = [
  {
    id: "why",
    title: "Why your own Groq key",
    body: "Alyra Master Perfumer is open source. We don't ship a shared Groq API key — your chats use your free Groq quota, on your account.",
    image: "/onboarding/groq/01-console.jpg",
    imageAlt: "Illustrative Groq Console sign-in screen",
    href: GROQ_CONSOLE_URL,
    hrefLabel: "Open Groq Console",
    onboardOnly: true,
  },
  {
    id: "signup",
    title: "Sign in to Groq Console",
    body: "Create a free GroqCloud account (or sign in), then open the developer console at console.groq.com.",
    image: "/onboarding/groq/01-console.jpg",
    imageAlt: "Illustrative Groq Console homepage with sign in",
    href: GROQ_CONSOLE_URL,
    hrefLabel: "console.groq.com",
  },
  {
    id: "api-keys",
    title: "Open API Keys",
    body: "In the left sidebar, click API Keys. You'll see any existing keys and a control to create a new one.",
    image: "/onboarding/groq/02-api-keys.jpg",
    imageAlt: "Illustrative Groq Console API Keys page",
    href: GROQ_CONSOLE_KEYS_URL,
    hrefLabel: "Open API Keys",
  },
  {
    id: "create",
    title: "Create API key",
    body: "Click Create API Key, give it a name like “chem-lab”, then confirm Create key.",
    image: "/onboarding/groq/03-create-key.jpg",
    imageAlt: "Illustrative Groq Console Create API Key dialog with gsk_ key",
  },
  {
    id: "copy",
    title: "Copy the key",
    body: "Copy the key once — Groq won't show the full value again. It starts with gsk_. Keep it private; never commit it.",
    image: "/onboarding/groq/04-copy-key.jpg",
    imageAlt: "Illustrative copy API key success state",
  },
  {
    id: "paste",
    title: "Paste into Alyra Labs",
    body: "Paste the key below. We encrypt it on the server scoped to your account and never show the full key again — only a short hint.",
    image: "/onboarding/groq/05-paste-in-app.jpg",
    imageAlt: "Illustrative Alyra Labs paste key panel",
    pasteForm: true,
  },
];

export const GROQ_ROTATE_STEPS: GroqGuideStep[] = [
  {
    id: "delete",
    title: "Delete the limited key",
    body: "Free-tier limits are per key. Delete your old key here first, then create a fresh one in Groq Console.",
    image: "/onboarding/groq/06-delete-rotate.jpg",
    imageAlt: "Illustrative Settings delete Groq key panel",
    rotateOnly: true,
  },
  ...GROQ_ONBOARD_STEPS.filter((s) => !s.onboardOnly && s.id !== "paste"),
  {
    id: "paste",
    title: "Paste the new key",
    body: "Paste your new gsk_… key. Chat will use it immediately after save.",
    image: "/onboarding/groq/05-paste-in-app.jpg",
    imageAlt: "Illustrative Alyra Labs paste key panel",
    pasteForm: true,
  },
];

export function stepsForMode(mode: GroqOnboardingMode): GroqGuideStep[] {
  return mode === "rotate" ? GROQ_ROTATE_STEPS : GROQ_ONBOARD_STEPS;
}
