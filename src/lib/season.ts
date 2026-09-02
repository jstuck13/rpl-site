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

export interface ScheduleDay {
  day: number;
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
  matchDay: number;
  date: string;
  scheduleDay?: number;
  scheduleNote?: string;
  bye: string[];
  series: SeriesResult[];
}

export const SCHEDULE = schedule.days as ScheduleDay[];
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

/**
 * Fixture days with no logged result yet.
 *
 * Matched by the `scheduleDay` recorded on each played match day, NOT by
 * counting — the league doesn't necessarily play the slates in schedule order.
 * Match Day 1, for instance, played the Day 9 slate. Counting would have marked
 * Day 1 as done and left Day 9 outstanding, which is exactly backwards.
 *
 * A played match day with no `scheduleDay` recorded clears nothing, so an
 * unmapped session leaves every fixture listed rather than silently retiring
 * the wrong one.
 */
export function remainingDays(): ScheduleDay[] {
  const played = new Set(
    MATCH_DAYS.map((d) => d.scheduleDay).filter(
      (d): d is number => typeof d === "number"
    )
  );
  return SCHEDULE.filter((d) => !played.has(d.day));
}

export const DAYS_PLAYED = MATCH_DAYS.length;
export const DAYS_TOTAL = SCHEDULE.length;
