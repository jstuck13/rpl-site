/**
 * Schedule, results and standings.
 *
 * Unlike the player data, these are hand-maintained JSON (see the note fields
 * in each file) rather than parsed out of the tracker — the tracker holds
 * cumulative player stats, not per-series results.
 *
 * Standings are computed from game scores, never stored, so they can't drift
 * out of sync with the results they're derived from.
 */

import schedule from "@/data/schedule.json";
import results from "@/data/results.json";
import { teamName, teamsForSeason } from "./teams";

/**
 * One night's slate: two series, two teams on bye.
 *
 * Lineups are a POOL, not a calendar. They have no numbers and no order — any
 * lineup can be played on any night, and the one that gets played next simply
 * becomes the next match day. The pool holds each pairing twice (the two legs
 * of the double round robin), so several lineups are deliberate duplicates.
 */
export interface Lineup {
  series: [string, string][];
  bye: string[];
}

export interface Game {
  game: number;
  home: number;
  away: number;
}

export interface SeriesResult {
  home: string;
  away: string;
  winner: string;
  games: Game[];
  summary?: string;
}

export interface MatchDay {
  /** Sequence in which it was actually played, not a position in the pool. */
  matchDay: number;
  date: string;
  bye: string[];
  series: SeriesResult[];
}

export const LINEUPS = schedule.lineups as Lineup[];
export const FORMAT = schedule.format;
export const MATCH_DAYS = results.matchDays as MatchDay[];

export interface Standing {
  code: string;
  name: string;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  seriesWon: number;
  seriesLost: number;
  played: boolean;
}

/** Win percentage, or null when a team hasn't played yet. */
export function winPct(s: Standing): number | null {
  const games = s.wins + s.losses;
  return games === 0 ? null : s.wins / games;
}

export function goalDiff(s: Standing): number {
  return s.goalsFor - s.goalsAgainst;
}

/**
 * Standings by games won, computed from every logged game.
 *
 * Teams that haven't played yet sort to the bottom rather than sitting at the
 * top on a vacuous 0-0. The tiebreaker below win percentage is goal difference;
 * RPL has deliberately not settled a formal tiebreaker, so this is a display
 * order, not a ruling.
 */
export function standings(season: number = 2): Standing[] {
  const table = new Map<string, Standing>();
  for (const team of teamsForSeason(season)) {
    table.set(team.code, {
      code: team.code,
      name: team.name,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      seriesWon: 0,
      seriesLost: 0,
      played: false,
    });
  }

  for (const day of MATCH_DAYS) {
    for (const series of day.series) {
      const home = table.get(series.home);
      const away = table.get(series.away);
      if (!home || !away) continue;

      home.played = true;
      away.played = true;

      for (const game of series.games) {
        home.goalsFor += game.home;
        home.goalsAgainst += game.away;
        away.goalsFor += game.away;
        away.goalsAgainst += game.home;
        if (game.home > game.away) {
          home.wins += 1;
          away.losses += 1;
        } else {
          away.wins += 1;
          home.losses += 1;
        }
      }

      if (series.winner === series.home) {
        home.seriesWon += 1;
        away.seriesLost += 1;
      } else {
        away.seriesWon += 1;
        home.seriesLost += 1;
      }
    }
  }

  return [...table.values()].sort((a, b) => {
    if (a.played !== b.played) return a.played ? -1 : 1;
    const pa = winPct(a) ?? 0;
    const pb = winPct(b) ?? 0;
    if (pb !== pa) return pb - pa;
    return goalDiff(b) - goalDiff(a);
  });
}

/** Series scoreline as games won, e.g. "2–1". */
export function seriesScore(series: SeriesResult): string {
  let home = 0;
  let away = 0;
  for (const game of series.games) {
    if (game.home > game.away) home += 1;
    else away += 1;
  }
  const winnerFirst = series.winner === series.home;
  const [a, b] = winnerFirst ? [home, away] : [away, home];
  return `${a}–${b}`;
}

export function seriesLabel(series: SeriesResult): string {
  return `${teamName(series.home)} v ${teamName(series.away)}`;
}

/** The pairings in a lineup or a played match day, order-independent. */
function pairingKey(pairs: [string, string][]): string {
  return pairs
    .map((pair) => [...pair].sort().join("+"))
    .sort()
    .join("|");
}

/**
 * Lineups still to be played.
 *
 * A played match day retires one lineup matching its pairings — no manual
 * bookkeeping, and nothing depends on the order the pool happens to be written
 * in. Because each pairing appears twice in the pool, playing it once retires
 * one of the two copies and leaves the rematch outstanding, which is correct.
 */
export function remainingLineups(): Lineup[] {
  const pool = [...LINEUPS];
  for (const day of MATCH_DAYS) {
    const key = pairingKey(
      day.series.map((s) => [s.home, s.away] as [string, string])
    );
    const i = pool.findIndex((l) => pairingKey(l.series) === key);
    if (i !== -1) pool.splice(i, 1);
  }
  return pool;
}

export const DAYS_PLAYED = MATCH_DAYS.length;
export const DAYS_TOTAL = LINEUPS.length;
