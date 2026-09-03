# Team colors + site chrome — implemented 2026-09-03

This was originally drafted as a handoff for the Claude Code session, then
implemented directly from a Cowork session the same day (files edited
in-place on `~/dev/rpl-graphics-ds` and `~/dev/rpl-site` via the device
bridge). Keeping this file as a short record rather than deleting it, in
case a future session wants the reasoning; the working checklist it used to
carry is done.

## What changed

**`rpl-graphics-ds/src/styles.css`** (mirrored byte-for-byte into
`rpl-site/src/ds/styles.css` — that's how vendoring works here, a plain copy
of the source `.tsx`/`.css`, not a built `dist/` import): added a neutral
`--rpl-accent` token family (`#b9b0a0` / bright `#e6ddc9` / deep `#6b6252`,
plus glow and gradient variants) and swapped every *default* brand-chrome use
of gold to it — frame/heading eyebrows, matchup label + VS node, lower-third
default accent, standings-row tick, player-card border/initials, scorebug VS
node. Gold itself is untouched and still used, deliberately, for: RankBadge's
1st-place medal, the `--gold` opt-in variants on StatTile and NotePanel, and
the in-game orange/blue scorebug sides (unrelated — never brand colors).

**Component API additions** (same file, `TeamChip`/`StandingsRow`/
`PlayerCard`/`MatchupHeader`, all mirrored into `rpl-site/src/ds/components/`):
each gained an optional `accent` prop (or `home.accent`/`away.accent` for
MatchupHeader) following the `LowerThird` component's existing pattern —
inject a CSS custom property, default to `--rpl-accent` when unset. TeamChip
renders a small colored dot before the label when `accent` is passed.

**`rpl-site/src/lib/teams.ts`**: filled in `accent` for all six Season 2
clubs — the six-color set validated with the dataviz skill's
`validate_palette.js` (lightness, chroma, CVD adjacent-pair separation,
normal-vision floor, contrast — all pass against the site's real panel
background `#14110a`). Excludes blue/orange (reserved for in-game sides).
Season 1 alumni teams (FWG/TD/TTT) intentionally left without an accent —
they predate this palette and fall back to neutral chrome, which is correct.

| Club | Accent |
|---|---|
| 999 | `#c98500` |
| Bucky Irving FC | `#199e70` |
| California Gurls | `#d55181` |
| Fortnite Flick FC | `#9085e9` |
| Lawson State | `#008300` |
| Own Goal FC | `#e66767` |

**Wired through**: `TeamChip` usages in `PlayerRow.tsx`, `players/[slug]`,
and `recaps/[matchDay]` now pass `accent={teamAccent(...)}`. `teams/page.tsx`
and `teams/[slug]/page.tsx` already set `--team-accent` inline, so they
picked up real colors automatically once `teams.ts` had them — also removed
the now-false "No team colors yet" note that was live on `/teams`.
`globals.css` got the same gold → accent sweep for site-wide chrome (nav,
CTA, links, tabs, table value column, tags, notes, profile/recap headings) —
**except** `.awards-bug` (the on-page award ticker), which stays gold on
purpose, same reasoning as the medal badge. Caught one real regression while
doing this: `AwardsOverlay.tsx`'s `LowerThird` had no explicit `accent`, so
it would have silently inherited the new neutral default instead of staying
gold for the OBS overlay — fixed by passing `accent="var(--rpl-gold)"`
explicitly there.

## Left as a genuine follow-up

`rpl-graphics-ds/dist/` (the compiled npm package output) was **not**
rebuilt — this Cowork session has no shell on the device, only file
read/write, and `npm run build` needs `tsc`. Confirmed `rpl-site` doesn't
consume `dist/` at all (`package.json` has no `@rpl/graphics` dependency —
it only uses the vendored source copy), so the live site is unaffected. If
anything else imports `@rpl/graphics` from `node_modules` (a Discord-graphic
script, say), run `npm run build` in `rpl-graphics-ds` before that consumer
picks up these changes.

## Team assignment

Proposed by hex-to-team-name feel, not by any real signal about the clubs —
still fair game to reassign. Swapping which team gets which of the six
validated hexes is safe as long as the fixed draft order in `teams.ts`
(999, BI, CG, FF, LS, OG) stays the adjacency order used wherever teams
render together — see the comment above `TEAMS` in `teams.ts` for why that
matters.
