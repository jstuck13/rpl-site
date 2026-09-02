/**
 * Team registry.
 *
 * The tracker stores teams as short codes in its Team column (an asterisk on
 * the code marks that player as the team's manager). This maps the codes to
 * display names.
 *
 * `accent` is deliberately unset for every team right now — the design system
 * is explicit that its orange/blue are in-game side colors, not brand colors,
 * and RPL has no per-team palette yet. Everything falls back to brand gold.
 * When team colors are chosen, fill `accent` in here and the standings,
 * player pages and team pages all pick it up.
 */

export interface Team {
  code: string;
  name: string;
  /** URL slug for the club's page, and the filename of its profile write-up. */
  slug: string;
  season: number;
  accent?: string;
}

export const TEAMS: Team[] = [
  // Season 2
  { code: "LS", name: "Lawson State", slug: "lawson-state", season: 2 },
  { code: "999", name: "999", slug: "999", season: 2 },
  { code: "OG", name: "Own Goal FC", slug: "own-goal-fc", season: 2 },
  { code: "CG", name: "California Gurls", slug: "california-gurls", season: 2 },
  { code: "FF", name: "Fortnite Flick FC", slug: "fortnite-flick-fc", season: 2 },
  { code: "BI", name: "Bucky Irving FC", slug: "bucky-irving-fc", season: 2 },

  // Season 1 (kept so alumni rows still resolve to a name)
  { code: "FWG", name: "FWG", slug: "fwg", season: 1 },
  { code: "TD", name: "TD", slug: "td", season: 1 },
  { code: "TTT", name: "TTT", slug: "ttt", season: 1 },
];

const BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));

export function teamByCode(code: string | null | undefined): Team | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

export function teamName(code: string | null | undefined): string {
  return teamByCode(code)?.name ?? code ?? "—";
}

export function teamAccent(code: string | null | undefined): string {
  return teamByCode(code)?.accent ?? "var(--rpl-gold)";
}

export function teamsForSeason(season: number): Team[] {
  return TEAMS.filter((t) => t.season === season);
}

const BY_SLUG = new Map(TEAMS.map((t) => [t.slug, t]));

export function teamBySlug(slug: string): Team | undefined {
  return BY_SLUG.get(slug);
}

export function teamSlug(code: string | null | undefined): string | undefined {
  return teamByCode(code)?.slug;
}
