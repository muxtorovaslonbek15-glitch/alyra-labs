/** Shared toast / banner copy for existing lab actions. */

export const labCopy = {
  signUpToMix: {
    title: "Sign up to continue",
    detail: "Create an account to Mix, react, and keep your stars",
  },
  signUpToPour: {
    title: "Sign up to continue",
    detail: "Create an account to pour more and Mix",
  },
  guestOneLeft: {
    title: "1 chemical left as guest",
    detail: "Sign up after the next pour to keep mixing",
  },
  guestBannerWarn:
    "One more chemical, then you'll need an account to Mix.",
  guestBannerBlocked: "Sign up to Mix, react, and keep your discoveries.",
  pourOk: (formula: string) => ({
    title: `Poured ${formula}`,
    detail: "Stir the liquid or press Mix when ready",
  }),
  pourFail: {
    title: "Couldn't pour",
    detail: "Bottle empty, or the vessel is past its spill limit",
  },
  pourOverflow: {
    title: "Overflowing",
    detail: "Past the rim — foam and spill on the desk",
  },
  dropOntoVessel: {
    title: "Drop onto a vessel",
    detail: "Place a beaker first, then pour chemicals into it",
  },
  burnerOn: {
    title: "Burner on",
    detail: "Heat attached to vessel",
  },
  iceBathOn: {
    title: "Ice bath on",
    detail: "Cooling attached to vessel",
  },
  stirring: {
    title: "Stirring",
    detail: "Keep stirring — Mix fires after enough swirls",
  },
  deskCleared: {
    title: "Desk cleared",
    detail: "All glassware removed",
  },
  emptyMix: {
    title: "Nothing to mix",
    detail: "Pour at least one note or chemical first",
  },
  emptyCast: {
    title: "Nothing to cast",
    detail: "Pour notes into the tin first",
  },
  pouringInto: (name: string) => ({
    title: "Pouring…",
    detail: `Into ${name}`,
  }),
  noVessel: {
    title: "No vessel on desk",
    detail: "Place a beaker first, then add from Scan.",
  },
  tutorOffline: "Offline notes. Unavailable right now.",
  tutorLive: "Live",
  tutorSaved: "Saved",
  tutorSignIn: "Sign in to unlock live notes.",
  tutorRateLimited: "Information is busy. Try again in a minute.",
  scanSignIn: "Sign in to scan notes with OCR.",
  scanRateLimited: "Too many scans — wait a moment and try again.",
} as const;
