@AGENTS.md

# rpl-site

The public website for the Rocket Premier League (RPL) — a friends' Rocket
League league run by Jacob. Live at https://rpl-site.vercel.app, deployed from
`main` on every push.

Next.js (App Router, TypeScript), plain CSS, no Tailwind. Static output.

## Architecture in one paragraph

Every page is generated at build time from JSON in `src/data/`. Nothing is
fetched at runtime, so a broken or restructured spreadsheet can never take the
live site down — it just means the data goes stale until it's regenerated. All
visual design comes from the RPL design system, vendored into `src/ds/`.

## Data

Two different kinds, and they're maintained differently:

**Parsed from the tracker** — `season1.json`, `season2.json`, `league.json`.
Source is RPL_Master_Tracker, a Google Sheet (Drive id
`10UJgkD8qTViTfeB61YtWLNVP4YvPcqs79URWG6JeX6I`). Export it to
`data/raw/tracker.json`, then `npm run data`.

`scripts/parse-tracker.mjs` reads a human-facing spreadsheet — merged cells,
styled headers, blank spacer rows. It locates the player table by its column
headers (`Player | Team | Rank | Status | Prior Value`) rather than by row
numbers, so restyling the sheet is safe; **renaming or reordering columns is
not**. It warns when a season parses to 0 players, which is the signal the
layout moved. If that becomes a recurring nuisance, the fix is a hidden flat
`WEB_EXPORT` tab in the sheet — pure formula references, one row per player, no
merges — and point the parser at that instead.

**Hand-maintained** — `schedule.json`, `results.json`. The tracker holds
cumulative player stats, not per-series scorelines, so match-day results are
entered by hand from the recaps. Logging a match day means updating both the
tracker (for values) and `results.json` (for scores).

### Tracker quirks the parser handles

- A trailing `*` on a **team code** (`FF*`) means that player is the club's
  manager.
- A trailing `*` on a **player name** (`Sajar47 *`) means they had no prior RPL
  season, so their Prior Value was seeded from the rank-table average instead of
  carried forward. Surfaced as `estimatedPriorValue`.
- **Dyloz is excluded from the site entirely** (`EXCLUDED_PLAYERS`). He has a
  tracker row because he wanted to play and couldn't. Jacob's call: no profile,
  no mention anywhere.
- **`Bl4ze the MaN` is corrected to `Bl4ze Th3 MaN`** (`NAME_CORRECTIONS`). The
  Season 2 tab has the wrong spelling; Season 1 and Jacob's profile docs have it
  right. The correction is what lets both seasons resolve to one slug and one
  player page. Fixing the sheet would let that entry go away.

## The schedule is a pool, not a calendar

This one matters and is easy to get wrong. The season is **15 lineups** (4 teams
playing 2 series, 2 on bye). They have **no order and no numbers** — any lineup
can be played on any night, and whichever gets played next simply becomes the
next match day.

- `schedule.json` has no day numbers. Don't add them.
- Match days in `results.json` are numbered by the order they were actually
  played. The first night played is Match Day 1, full stop.
- `remainingLineups()` retires a lineup by matching its pairings against played
  results — no manual bookkeeping. Each pairing appears twice in the pool (the
  two legs of the double round robin), so playing it once retires one copy.
- The UI must never imply a fixed calendar or reference lineup numbers. An
  earlier version said "the Day 9 slate was played first" and Jacob explicitly
  asked for that rigidity removed.

## Design system

`src/ds/` is a **vendored copy** of `@rpl/graphics`, whose source of truth is
the separate `rpl-graphics-ds` repo. Re-copy `src/components`, `src/styles.css`
and `src/fonts` when it changes. If drift becomes annoying, publish it to npm
and depend on it properly.

Rules for styling anything new:

- Use `--rpl-*` tokens. Never introduce a new color, font or spacing value.
  `src/app/globals.css` owns responsive page layout only; the design system owns
  the brand. This is what keeps the site and Jacob's Discord graphics identical.
- The standings-family components (`TeamChip`, `RankBadge`, `StandingsRow`,
  `StatTile`, `PlayerCard`) work on the web and should be used.
- `GraphicFrame`, `Scorebug`, `LowerThird` and `MatchupHeader` are **broadcast
  furniture** hard-coded to 1080px. Do not use them for page layout.

### No team colors exist

Every club renders in brand gold. The design system is explicit that its orange
and blue are in-game side colors, *not* brand colors, and `TeamChip` is an
uncolored pill. When Jacob picks team colors, fill in `accent` for each team in
`src/lib/teams.ts` — standings, team cards and player pages all read from
`teamAccent()`, so nothing else needs touching. Adding them to the design system
as real tokens would let the Discord graphics use them too.

## Layout of the code

```
src/data/      generated + hand-maintained JSON (the only data source)
src/lib/       data.ts (players/values), season.ts (schedule/results/standings),
               teams.ts (team registry)
src/ds/        vendored design system — treat as read-only, re-sync from source
src/app/       routes: /, /standings, /schedule, /leaderboard, /teams, /players
scripts/       parse-tracker.mjs
```

Standings are **computed** from game scores in `season.ts`, never stored, so
they can't drift from the results they come from. Ranked by games won (not
series won) since every Bo3 game counts. Unplayed clubs sort to the bottom
rather than topping the table on a vacuous 0–0. Goal difference is the display
tiebreaker only — RPL has deliberately not settled a formal one, so don't
present it as a ruling.

## Not built yet

- Nuanced stats hub — boost economy, possession/territory, demos, movement.
  Source is a separate "RPL Season 2 Nuanced Team & Player Comparison" Google
  Sheet, not the tracker.
- Player profile prose. Jacob has ~20 written player profiles in his Claude
  project (RPL OPS, under `claude/players/`) that aren't on the site yet; player
  pages are stats-only. They'd need to be brought into the repo as content.
- Season 1 archive views. The data is parsed and shipped, just not surfaced.

## Commands

```bash
npm run dev     # http://localhost:3000
npm run data    # regenerate src/data/*.json from data/raw/tracker.json
npm run build   # production build — always run before pushing
```

## Deploy gotcha

The first deploy 404'd every route while reporting "Ready" in 26 seconds,
because the Vercel project was imported when the repo held only a README —
Vercel detected no framework and set Framework Preset to "Other", which just
copies `public/`. If routes 404 but the build is green, check Project Settings →
Build and Deployment → Framework Preset says **Next.js**.
