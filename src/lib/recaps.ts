/**
 * Match day recaps.
 *
 * Source is markdown in `data/raw/recaps/`, built into `src/data/recaps.json`
 * by `npm run recaps` — the same two-step as the profiles, and for the same
 * reason: the drafts are written against internal notes, so nothing reaches
 * the site without passing the strip rules in scripts/build-recaps.mjs.
 *
 * Match day numbers are the order nights were actually played. They are not
 * positions in the schedule pool, which has no order at all.
 */

import recapsJson from "@/data/recaps.json";

export interface Recap {
  matchDay: number;
  date: string;
  title: string;
  subtitle: string | null;
  /** One sentence for the front page hero. */
  headline: string;
  teamsPlayed: string[];
  teamsOnBye: string[];
  /** Build-time HTML from `npm run recaps`. Not user input. */
  html: string;
}

/** Newest first — the build script settles the order. */
export const RECAPS: Recap[] = recapsJson.recaps as Recap[];

export function latestRecap(): Recap | undefined {
  return RECAPS[0];
}

export function recapByMatchDay(matchDay: number): Recap | undefined {
  return RECAPS.find((r) => r.matchDay === matchDay);
}

/**
 * A plain calendar date, rendered the same everywhere regardless of where the
 * build runs — these are dates, not instants, so they're read in UTC.
 */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
