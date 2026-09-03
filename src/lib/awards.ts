/**
 * The four RPL awards, computed live from the season's logged games.
 *
 * The definitions are RPL's own, taken from how Season 1 was actually awarded
 * — and note they are deliberately NOT on a common basis: the Boot and Laces
 * are season totals, while the Gloves and MVP are per-game averages. Season 1
 * went to Astro (31 goals), TLBoryczka (25 assists), NO LIGHT (2.05 saves/game)
 * and zPylo (439.05 points/game) on exactly those readings, so don't "fix" them
 * into one shape.
 *
 * Nothing is stored: like standings, these are derived, so they can't drift
 * from the numbers they come from. Early in a season they are mostly ties —
 * that's honest, and the UI shows every co-leader rather than picking one.
 */

import { CURRENT_SEASON, getSeason, type Player } from "./data";

export interface AwardHolder {
  name: string;
  slug: string;
  team: string | null;
}

export interface Award {
  key: string;
  name: string;
  /** What the award is measured on, in plain words. */
  basis: string;
  /** The leading figure, already formatted. */
  value: string;
  /** Everyone level on it — usually one player, often several early on. */
  holders: AwardHolder[];
}

interface Definition {
  key: string;
  name: string;
  basis: string;
  metric: (player: Player) => number | null;
  format: (value: number) => string;
}

const DEFINITIONS: Definition[] = [
  {
    key: "golden-boot",
    name: "Golden Boot",
    basis: "Most goals",
    metric: (p) => p.totals.goals,
    format: (v) => `${v} goal${v === 1 ? "" : "s"}`,
  },
  {
    key: "golden-laces",
    name: "Golden Laces",
    basis: "Most assists",
    metric: (p) => p.totals.assists,
    format: (v) => `${v} assist${v === 1 ? "" : "s"}`,
  },
  {
    key: "golden-gloves",
    name: "Golden Gloves",
    basis: "Most saves per game",
    metric: (p) => p.averages.saves,
    format: (v) => `${v.toFixed(2)} saves per game`,
  },
  {
    key: "season-mvp",
    name: "Season MVP",
    basis: "Most points per game",
    metric: (p) => p.averages.points,
    format: (v) => `${v.toFixed(2)} points per game`,
  },
];

/** Averages are floats, so level is level to within rounding. */
const EPSILON = 1e-9;

export function awards(season: number = CURRENT_SEASON): Award[] {
  const eligible = getSeason(season).players.filter(
    (p) => (p.totals.games ?? 0) > 0
  );
  if (eligible.length === 0) return [];

  return DEFINITIONS.flatMap((definition) => {
    const scored = eligible
      .map((player) => ({ player, value: definition.metric(player) }))
      .filter((entry): entry is { player: Player; value: number } =>
        entry.value !== null
      );
    if (scored.length === 0) return [];

    const best = Math.max(...scored.map((entry) => entry.value));
    if (best <= 0) return [];

    const holders = scored
      .filter((entry) => Math.abs(entry.value - best) < EPSILON)
      .map((entry) => entry.player)
      // Alphabetical so a tie has no implied pecking order.
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
      .map((player) => ({
        name: player.name,
        slug: player.slug,
        team: player.team,
      }));

    return [
      {
        key: definition.key,
        name: definition.name,
        basis: definition.basis,
        value: definition.format(best),
        holders,
      },
    ];
  });
}
