/**
 * The next match night.
 *
 * `schedule.json` is an unordered pool with no dates, so the site can't derive
 * what's next — this is hand-set, and deliberately kept out of schedule.json so
 * a hurried edit here can't corrupt the pool.
 *
 * Clubs, never home/away: RPL has no home/away assignment, and the blue/orange
 * in the schedule graphics is a visual motif, not a rule.
 *
 * Nothing in here may break a page. An empty file, a missing date and a stale
 * entry all have defined renders, and a pairing that isn't in the remaining
 * pool warns at build time rather than failing — Jacob may deliberately
 * schedule something off-pool, and a hero field should never break a deploy.
 */

import nextUpJson from "@/data/next-up.json";
import { latestRecap } from "./recaps";
import { remainingLineups } from "./season";

export interface NextUpSeries {
  clubs: string[];
}

export interface NextUp {
  series: NextUpSeries[];
  date: string | null;
  time: string | null;
  timezone: string;
  watchUrl: string | null;
  note: string | null;
}

const NEXT_UP = nextUpJson as NextUp;

/** Clubs named across every series in the block. */
function clubsIn(series: NextUpSeries[]): string[] {
  return series.flatMap((s) => s.clubs);
}

/**
 * The night already happened.
 *
 * If the newest recap covers every club this block advertises, the block is
 * describing a night that's now in the past — a forgotten update otherwise
 * advertises a match night that already happened, which is worse than showing
 * nothing. It's the one place recaps and next-up need to know about each other.
 */
function isStale(next: NextUp): boolean {
  const recap = latestRecap();
  if (!recap) return false;
  const played = new Set(recap.teamsPlayed);
  return clubsIn(next.series).every((club) => played.has(club));
}

let warned = false;

/** Warn — never throw — when a pairing isn't in the remaining pool. */
function warnIfOffPool(next: NextUp): void {
  if (warned) return;
  warned = true;

  const pool = new Set(
    remainingLineups().flatMap((lineup) =>
      lineup.series.map((pair) => [...pair].sort().join("+"))
    )
  );
  for (const series of next.series) {
    const key = [...series.clubs].sort().join("+");
    if (!pool.has(key)) {
      console.warn(
        `next-up.json: ${series.clubs.join(" v ")} is not in the remaining ` +
          `lineup pool. Fine if it's deliberate — just check it isn't a typo.`
      );
    }
  }
}

/** The block to render, or null when there's nothing to advertise. */
export function nextUp(): NextUp | null {
  if (NEXT_UP.series.length === 0) return null;
  warnIfOffPool(NEXT_UP);
  if (isStale(NEXT_UP)) return null;
  return NEXT_UP;
}

/** "8:00 PM CDT" — built from the wall-clock string, never re-parsed as an instant. */
export function formatTime(next: NextUp): string | null {
  if (!next.time) return null;
  const [hoursRaw, minutes] = next.time.split(":");
  const hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return null;

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes ?? "00"} ${suffix}${zoneLabel(next) ?? ""}`;
}

function zoneLabel(next: NextUp): string | null {
  if (!next.timezone || !next.date) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: next.timezone,
      timeZoneName: "short",
    }).formatToParts(new Date(`${next.date}T12:00:00Z`));
    const zone = parts.find((p) => p.type === "timeZoneName")?.value;
    return zone ? ` ${zone}` : null;
  } catch {
    // An unknown IANA zone shouldn't take a page down.
    return null;
  }
}
