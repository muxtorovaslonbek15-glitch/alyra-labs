/** ★ navbar is a presence check-in, not a Goals launcher. */

export type CheckInPresence = "guest" | "not-yet" | "here-today";

export function checkInPresence(opts: {
  signedIn: boolean;
  grantedToday: boolean;
}): CheckInPresence {
  if (!opts.signedIn) return "guest";
  return opts.grantedToday ? "here-today" : "not-yet";
}

export function checkInCopy(presence: CheckInPresence): {
  title: string | null;
  subline: string;
} {
  switch (presence) {
    case "guest":
      return { title: null, subline: "Sign in to check in each day." };
    case "not-yet":
      return { title: null, subline: "A star when you return." };
    case "here-today":
      return { title: "Here today.", subline: "Another star tomorrow." };
  }
}

export function checkInAria(
  stars: number,
  presence: CheckInPresence,
): string {
  switch (presence) {
    case "guest":
      return "Stars, sign in to check in";
    case "not-yet":
      return `${stars} stars, check in`;
    case "here-today":
      return `${stars} stars, here today`;
  }
}

/** Guests with an honest zero show the glyph only. Never invent a count. */
export function checkInShowsCount(
  stars: number,
  presence: CheckInPresence,
): boolean {
  if (presence === "guest" && stars <= 0) return false;
  return true;
}

/** Idle ★ drawer must never greet with a chem quest. */
export function idleStarCopyIsQuiet(blob: string): boolean {
  return !/free-play|produce a gas|form a precipitate|combustion|neutralize an acid|\bbadge/i.test(
    blob,
  );
}
