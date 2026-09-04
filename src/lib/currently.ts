/**
 * Computed "what's actually interesting right now" for /currently —
 * standings movement and active win/loss streaks. Both are derived purely
 * from results.json, same as standings() and awards(), so there's nothing
 * to keep in sync and nothing that can go stale: they're correct again the
 * moment a new match day is logged and `npm run data` runs.
 *
 * Award-race gaps live in awards.ts (awardGaps()) instead, next to the
 * DEFINITIONS they share with awards() — kept there so the two can never
 * disagree about who's leading.
 */

import { MATCH_DAYS, standings, type MatchDay } from "./season";
import { teamsForSeason } from "./teams";

export interface StandingsMovement {
  code: string;
  name: string;
  currentRank: number;
  previousRank: number;
  /** Positive = moved up the table (rank numbers get smaller going up). */
  delta: number;
}

/**
 * Which teams moved in the table because of the most recently played match
 * day — current rank vs. rank as of the match day before that. Needs at
 * least two logged match days to have a "before" to compare against; before
 * that this is deliberately empty rather than diffing against an all-0-0
 * baseline, which isn't a meaningful "movement" signal.
 */
export function standingsMovement(season: number = 2): StandingsMovement[] {
  const sorted = sortedMatchDays();
  if (sorted.length < 2) return [];

  const previousThrough = sorted[sorted.length - 2].matchDay;
  const current = standings(season);
  const previous = standings(season, previousThrough);

  const previousRankByCode = new Map(
    previous.map((s, i) => [s.code, i + 1])
  );

  const moved: StandingsMovement[] = [];
  current.forEach((s, i) => {
    const previousRank = previousRankByCode.get(s.code);
    if (previousRank === undefined) return;
    const currentRank = i + 1;
    const delta = previousRank - currentRank;
    if (delta !== 0) {
      moved.push({ code: s.code, name: s.name, currentRank, previousRank, delta });
    }
  });

  return moved.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export interface TeamStreak {
  code: string;
  name: string;
  result: "W" | "L";
  length: number;
}

/**
 * Teams currently on a run of 2+ straight series wins or losses. A length-1
 * "streak" (won or lost your last series) is true of nearly every team on
 * any given night and isn't actually a story, so those are filtered out —
 * this only surfaces once something's genuinely building.
 */
export function teamStreaks(season: number = 2): TeamStreak[] {
  const sorted = sortedMatchDays();
  const resultsByTeam = new Map<string, ("W" | "L")[]>();

  for (const day of sorted) {
    for (const series of day.series) {
      for (const code of [series.home, series.away]) {
        const result: "W" | "L" = series.winner === code ? "W" : "L";
        const list = resultsByTeam.get(code) ?? [];
        list.push(result);
        resultsByTeam.set(code, list);
      }
    }
  }

  const nameByCode = new Map(
    teamsForSeason(season).map((t) => [t.code, t.name])
  );

  const streaks: TeamStreak[] = [];
  for (const [code, results] of resultsByTeam) {
    if (results.length === 0) continue;
    const last = results[results.length - 1];
    let length = 0;
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) {
      length += 1;
    }
    if (length >= 2) {
      streaks.push({ code, name: nameByCode.get(code) ?? code, result: last, length });
    }
  }

  return streaks.sort((a, b) => b.length - a.length);
}

function sortedMatchDays(): MatchDay[] {
  return [...MATCH_DAYS].sort((a, b) => a.matchDay - b.matchDay);
}
