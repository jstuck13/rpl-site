/**
 * Team registry.
 *
 * The club list itself lives in `src/data/clubs.json` — NOT here. That file is
 * the canonical source: the site reads it through this module, and the RPL
 * graphics and availability skills read it directly instead of each keeping a
 * hand-copied list. Add or rename a club there and nothing else needs editing.
 *
 * This module is the typed accessor over it, and nothing more. Everything the
 * rest of the site imports (`teamName`, `teamAccent`, `teamsForSeason`, …) is
 * unchanged.
 *
 * The tracker stores teams as short codes in its Team column (an asterisk on
 * the code marks that player as the team's manager). These map the codes to
 * display names.
 *
 * `accent` — one colour per Season 2 club, picked with the dataviz skill's
 * categorical-colour method (lightness band, chroma floor, CVD adjacent-pair
 * separation, normal-vision floor, surface contrast) against the site's actual
 * panel background (#14110a). Two things keep that validation true and both
 * are easy to break:
 *
 *   1. The colours were checked as ADJACENT PAIRS IN clubs.json'S ORDER. Clubs
 *      must render in that same order wherever they appear together — don't
 *      re-sort by squad value in a context that puts colours side by side.
 *   2. A colour is never the sole identifier. Always pair it with the club
 *      name, as TeamChip and the team-dot do.
 *
 * Blue and orange are deliberately absent: the design system reserves them as
 * in-game side colours, and reusing either would clash on any page showing a
 * match.
 *
 * A club belongs to exactly ONE season here. 999 and Lawson State played in
 * both and are registered under Season 2, so `teamsForSeason(1)` returns only
 * the three Season 1 clubs and is the WRONG tool for anything cross-season —
 * group by the players' own team codes instead (see `src/lib/archive.ts`).
 * Registering a duplicate entry under the same code would shadow the Season 2
 * one and strip its accent.
 *
 * Fire Water Gang and Bucky Irving FC are unrelated clubs. FWG was entered for
 * Season 2 as well, then dropped out before play, and DrewAJC's Bucky Irving FC
 * took the vacated slot. BI is NOT a renamed FWG — confirmed by Jacob
 * 2026-09-09, correcting an earlier project doc that described it as a rename.
 * That is why FWG appears in Season 2 artefacts predating the withdrawal (the
 * nuanced-stats sheet, early draft tabs) and nowhere in the Season 2 results.
 */

import clubs from "@/data/clubs.json";

export interface Team {
  code: string;
  name: string;
  /** URL slug for the club's page, and the filename of its profile write-up. */
  slug: string;
  season: number;
  accent?: string;
}

export const TEAMS: Team[] = clubs.clubs as Team[];

const BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));

export function teamByCode(code: string | null | undefined): Team | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

export function teamName(code: string | null | undefined): string {
  return teamByCode(code)?.name ?? code ?? "—";
}

/**
 * A club's colour, or the neutral chrome accent for clubs that have none.
 *
 * NOTE the fallback is a CSS variable, which is fine in the browser and NOT
 * fine anywhere CSS variables don't exist — Satori resolves it to `initial`
 * and throws. `src/lib/og.tsx` guards against that; anything else rendering
 * outside the browser must too.
 */
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
