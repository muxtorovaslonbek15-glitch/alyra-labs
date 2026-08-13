export const STAR_MILESTONE_COUNT = 30;

export const DEFAULT_STAR_MILESTONE_EMAIL = "ncarnac@gmail.com";

/**
 * Recipient for the 30★ note.
 * Client: `NEXT_PUBLIC_STAR_MILESTONE_EMAIL`
 * Server: `STAR_MILESTONE_EMAIL` (same default)
 */
export function starMilestoneEmail(): string {
  const pub = process.env.NEXT_PUBLIC_STAR_MILESTONE_EMAIL?.trim();
  if (pub) return pub;
  const srv = process.env.STAR_MILESTONE_EMAIL?.trim();
  if (srv) return srv;
  return DEFAULT_STAR_MILESTONE_EMAIL;
}

export function starMilestoneMailto(email: string = starMilestoneEmail()): string {
  const subject = encodeURIComponent("Alyra Labs · 30 stars");
  const body = encodeURIComponent("Have done 30! I will get a star.");
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function milestoneDismissKey(uid: string): string {
  return `alyra.starMilestoneDismissed:${uid}`;
}
