/**
 * Team registry.
 *
 * The tracker stores teams as short codes in its Team column (an asterisk on
 * the code marks that player as the team's manager). This maps the codes to
 * display names.
 *
 * `accent` — six colors, one per Season 2 club, picked with the dataviz
 * skill's categorical-color method (validate_palette.js): lightness band,
 * chroma floor, CVD adjacent-pair separation, normal-vision floor, and
 * surface contrast all pass against the site's actual panel background
 * (#14110a), in this fixed order (aqua, amber, rose, green, violet, red).
 * Deliberately excludes blue and orange — the design system reserves those
 * as in-game side colors, not brand colors, and reusing either for a team
 * would clash on any page showing a match. Two things keep this palette
 * valid: teams render in this same order everywhere they appear together
 * (draft order, used consistently — don't re-sort by e.g. squad value in a
 * context that puts colors next to each other in a new arrangement), and a
 * color is never the sole identifier — always paired with the team name via
 * TeamChip/team-card, never color alone. Season 1 alumni teams (FWG/TD/TTT)
 * are left unset on purpose — they predate this palette and fall back to the
 * neutral --rpl-accent chrome color, which is correct: they're historical
 * record, not clubs playing for one of the six identities.
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
  // Season 2 — accents in fixed draft order (see note above)
  { code: "999", name: "999", slug: "999", season: 2, accent: "#c98500" },
  { code: "BI", name: "Bucky Irving FC", slug: "bucky-irving-fc", season: 2, accent: "#199e70" },
  { code: "CG", name: "California Gurls", slug: "california-gurls", season: 2, accent: "#d55181" },
  { code: "FF", name: "Fortnite Flick FC", slug: "fortnite-flick-fc", season: 2, accent: "#9085e9" },
  { code: "LS", name: "Lawson State", slug: "lawson-state", season: 2, accent: "#008300" },
  { code: "OG", name: "Own Goal FC", slug: "own-goal-fc", season: 2, accent: "#e66767" },

  // Season 1 (kept so alumni rows still resolve to a name; no accent — see above)
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
  return teamByCode(code)?.accent ?? "var(--rpl-accent)";
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
