# RPL — Rocket Premier League

The public site for the Rocket Premier League: Player Value leaderboard, clubs,
and per-player pages. Built with Next.js, deployed on Vercel.

## How the data works

The site is **static**. Every page is generated at build time from JSON in
`src/data/`, so a broken or restructured spreadsheet can never take the live
site down — it just means the data goes stale until it's regenerated.

The chain is:

```
RPL_Master_Tracker (Google Sheet)
  -> data/raw/tracker.json      exported via the Google Drive connector
  -> npm run data               scripts/parse-tracker.mjs
  -> src/data/*.json            typed, flat, committed to the repo
  -> next build                 static pages
```

### Updating after a match day

1. Log stats in RPL_Master_Tracker as normal.
2. Re-export the sheet into `data/raw/tracker.json`.
3. `npm run data` — regenerates `src/data/*.json`.
4. Commit and push. Vercel redeploys automatically.

In practice steps 2–4 are what Claude does when you ask it to update the site.

### A caveat about the parser

`scripts/parse-tracker.mjs` reads a human-facing spreadsheet — merged cells,
styled headers, blank spacer rows. It locates the player table by its column
headers (`Player | Team | Rank | Status | Prior Value`) rather than by fixed row
numbers, so cosmetic changes to the sheet are safe. **Renaming or reordering
columns is not.** If a season parses to 0 players, the script warns — that's the
signal the layout moved.

A more durable fix, if this ever gets annoying: add a hidden flat `WEB_EXPORT`
tab to the tracker that's pure formula references, one row per player, no
merges. The parser then reads that instead and stops caring how the pretty tabs
look.

## Branding

All visual design comes from `@rpl/graphics`, the RPL design system, vendored
into `src/ds/`. Tokens, fonts (Rajdhani + Inter) and the standings components
(`TeamChip`, `RankBadge`, `StandingsRow`, `StatTile`, `PlayerCard`) are used
as-is. The design system's broadcast components (`Scorebug`, `LowerThird`,
`MatchupHeader`, `GraphicFrame`) are built for fixed 1080px graphics and are
**not** used for page layout — `src/app/globals.css` handles responsive layout,
built only from design-system tokens so the site and the Discord graphics stay
visually identical.

`src/ds/` is a vendored copy. The source of truth is the `rpl-graphics-ds`
repo; re-copy `src/components`, `src/styles.css` and `src/fonts` when it
changes. If the drift gets annoying, publish `@rpl/graphics` to npm and depend
on it properly.

### Team colors

There are none yet. The design system is explicit that its orange and blue are
in-game side colors, not brand colors, so every club currently renders in brand
gold. When team colors are chosen, fill in `accent` for each team in
`src/lib/teams.ts` and the standings, team cards and player pages all pick it
up — no other changes needed.

## Not built yet

- Schedule and match-day results
- Nuanced stats hub (boost economy, possession, demos, movement)
- Season 1 archive views

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
npm run data    # regenerate src/data/*.json from data/raw/tracker.json
npm run build   # production build
```
