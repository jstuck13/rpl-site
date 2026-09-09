/**
 * Completed-season archive.
 *
 * Season 1 finished before the site existed, so there are no per-series
 * scorelines for it — `results.json` starts at Season 2. What survives is the
 * tracker: final values, cumulative stats, and rosters. This module derives
 * everything a closed season can honestly show from that, and nothing more.
 *
 * Clubs are grouped from the players' own `team` codes rather than from
 * `teamsForSeason()`, deliberately: the team registry models a club as
 * belonging to ONE season, so 999 and Lawson State — which played in both —
 * are registered under Season 2 only. Grouping from the data avoids that,
 * and works for any season without touching the registry.
 */

import { getSeason, type Player } from "./data";
import { teamName } from "./teams";

export interface ArchiveClub {
  code: string;
  name: string;
  players: Player[];
  /** Summed final Player Value. Null when any player's value was voided. */
  squadValue: number | null;
  active: boolean;
}

export interface AwardWinner {
  label: string;
  /** How the winner is decided, in plain words. */
  basis: string;
  player: Player | null;
  value: number | null;
  format: "money" | "count" | "average";
}

/** Clubs in a completed season, highest squad value first; voided clubs last. */
export function archiveClubs(season: number): ArchiveClub[] {
  const byCode = new Map<string, Player[]>();
  for (const p of getSeason(season).players) {
    if (!p.team) continue;
    byCode.set(p.team, [...(byCode.get(p.team) ?? []), p]);
  }

  return [...byCode.entries()]
    .map(([code, players]) => {
      const active = players.some((p) => p.status === "Active");
      const voided = players.some((p) => p.valuation.playerValue === null);
      return {
        code,
        name: teamName(code),
        players: [...players].sort(
          (a, b) =>
            (b.valuation.playerValue ?? -1) - (a.valuation.playerValue ?? -1)
        ),
        squadValue: voided
          ? null
          : players.reduce((sum, p) => sum + (p.valuation.playerValue ?? 0), 0),
        active,
      };
    })
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.squadValue ?? -1) - (a.squadValue ?? -1);
    });
}

/**
 * The four season awards, resolved for a completed season.
 *
 * Active players only — an Inactive player can't win one even with the best
 * numbers, which is the rule that decides TTT's Season 1 lines.
 */
export function archiveAwards(season: number): AwardWinner[] {
  const eligible = getSeason(season).players.filter(
    (p) => p.status === "Active"
  );

  const best = (pick: (p: Player) => number | null) => {
    let winner: Player | null = null;
    let value: number | null = null;
    for (const p of eligible) {
      const v = pick(p);
      if (v === null) continue;
      if (value === null || v > value) {
        winner = p;
        value = v;
      }
    }
    return { player: winner, value };
  };

  return [
    {
      label: "Season MVP",
      basis: "Highest average points per game",
      format: "average" as const,
      ...best((p) => p.averages.points),
    },
    {
      label: "Golden Boot",
      basis: "Most goals",
      format: "count" as const,
      ...best((p) => p.totals.goals),
    },
    {
      label: "Golden Laces",
      basis: "Most assists",
      format: "count" as const,
      ...best((p) => p.totals.assists),
    },
    {
      label: "Golden Gloves",
      basis: "Highest average saves per game",
      format: "average" as const,
      ...best((p) => p.averages.saves),
    },
  ];
}

/** Final value board — everyone who finished the season with a value. */
export function archiveBoard(season: number): Player[] {
  return getSeason(season)
    .players.filter((p) => p.valuation.playerValue !== null)
    .sort(
      (a, b) => (b.valuation.playerValue ?? 0) - (a.valuation.playerValue ?? 0)
    );
}

/** Players whose value was voided — kept visible, with their stats intact. */
export function archiveVoided(season: number): Player[] {
  return getSeason(season).players.filter(
    (p) => p.valuation.playerValue === null
  );
}
