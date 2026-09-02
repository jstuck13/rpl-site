/**
 * Typed access to the JSON the tracker parser generates.
 *
 * Everything here is read at build time — the site ships as static pages, so
 * a broken sheet can never take the site down. Regenerate with `npm run data`.
 */

import season1 from "@/data/season1.json";
import season2 from "@/data/season2.json";
import league from "@/data/league.json";
import profiles from "@/data/profiles.json";
import teamProfiles from "@/data/team-profiles.json";
import { teamsForSeason } from "./teams";

export interface PlayerTotals {
  goals: number | null;
  assists: number | null;
  saves: number | null;
  shots: number | null;
  points: number | null;
  games: number | null;
}

export interface PlayerAverages {
  goals: number | null;
  assists: number | null;
  saves: number | null;
  shots: number | null;
  points: number | null;
}

export interface PlayerValuation {
  baseValue: number | null;
  vsRankBaselinePct: number | null;
  modifier: number | null;
  seasonValue: number | null;
  weightOnPriorPct: number | null;
  playerValue: number | null;
}

export interface Player {
  name: string;
  slug: string;
  /** Prior Value was seeded from the rank baseline, not carried from a real prior season. */
  estimatedPriorValue: boolean;
  team: string | null;
  isManager: boolean;
  rank: string | null;
  status: string | null;
  priorValue: number | null;
  totals: PlayerTotals;
  averages: PlayerAverages;
  valuation: PlayerValuation;
}

export interface Season {
  season: number;
  players: Player[];
}

const SEASONS: Season[] = [season1 as Season, season2 as Season];

export const CURRENT_SEASON: number = league.currentSeason;
export const GENERATED_AT: string = league.generatedAt;

export function getSeason(season: number = CURRENT_SEASON): Season {
  const found = SEASONS.find((s) => s.season === season);
  if (!found) throw new Error(`No data for season ${season}`);
  return found;
}

export function allSeasons(): Season[] {
  return SEASONS;
}

/** Players on a roster this season, highest Player Value first. */
export function leaderboard(season: number = CURRENT_SEASON): Player[] {
  return getSeason(season)
    .players.filter((p) => p.team && p.valuation.playerValue !== null)
    .sort(
      (a, b) => (b.valuation.playerValue ?? 0) - (a.valuation.playerValue ?? 0)
    );
}

/** Players with no current roster spot (Season 1 alumni sitting the season out). */
export function alumni(season: number = CURRENT_SEASON): Player[] {
  return getSeason(season).players.filter(
    (p) => p.status === "Inactive" || !p.team
  );
}

/**
 * Every player in a season, grouped by status — the ones playing first, the
 * ones sitting it out last — and alphabetical inside each group.
 */
const STATUS_ORDER = ["Active", "Exempt", "Inactive"];

export function playersByStatus(season: number = CURRENT_SEASON): Player[] {
  const group = (p: Player) => {
    const i = STATUS_ORDER.indexOf(p.status ?? "");
    return i === -1 ? STATUS_ORDER.length : i;
  };
  return [...getSeason(season).players].sort(
    (a, b) =>
      group(a) - group(b) ||
      a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );
}

export interface TeamRoster {
  code: string;
  name: string;
  players: Player[];
  totalValue: number;
  manager: Player | null;
}

/** Rosters for a season, richest squad first. */
export function rosters(season: number = CURRENT_SEASON): TeamRoster[] {
  const players = getSeason(season).players;
  return teamsForSeason(season)
    .map((team) => {
      const squad = players
        .filter((p) => p.team === team.code)
        .sort(
          (a, b) =>
            (b.valuation.playerValue ?? 0) - (a.valuation.playerValue ?? 0)
        );
      return {
        code: team.code,
        name: team.name,
        players: squad,
        totalValue: squad.reduce(
          (sum, p) => sum + (p.valuation.playerValue ?? 0),
          0
        ),
        manager: squad.find((p) => p.isManager) ?? null,
      };
    })
    .filter((t) => t.players.length > 0)
    .sort((a, b) => b.totalValue - a.totalValue);
}

export function playerBySlug(
  slug: string,
  season: number = CURRENT_SEASON
): Player | undefined {
  return getSeason(season).players.find((p) => p.slug === slug);
}

/** Every season this player appears in, oldest first. */
export function playerHistory(slug: string): { season: number; player: Player }[] {
  return SEASONS.flatMap((s) => {
    const player = s.players.find((p) => p.slug === slug);
    return player ? [{ season: s.season, player }] : [];
  });
}

export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toLocaleString("en-US")}`;
}

export function formatNum(value: number | null, digits = 2): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

/* ---- player profiles ------------------------------------------------------ */

export interface ProfileSection {
  heading: string;
  /** Build-time HTML from `npm run profiles`. Not user input. */
  html: string;
}

export interface Profile {
  slug: string;
  intro: string;
  sections: ProfileSection[];
}

const PROFILES = profiles as Record<string, Profile>;

export function profileBySlug(slug: string): Profile | undefined {
  return PROFILES[slug];
}

const TEAM_PROFILES = teamProfiles as Record<string, Profile>;

export function teamProfileBySlug(slug: string): Profile | undefined {
  return TEAM_PROFILES[slug];
}
