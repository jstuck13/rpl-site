# data/derived

Output of `npm run derive` (`scripts/derive-stats.mjs`). Not read by the site.

## What `stat-entry.json` is

The six cumulative stat columns RPL_Master_Tracker holds per player — Goals,
Assists, Saves, Shots, Points, Games Played — **derived from the nuanced-stats
sheet instead of retyped from a scoreboard screenshot**, plus the five averages
and a diff against what the tracker currently says.

`rpl-stat-entry` reads this file and confirms the numbers before writing them
into the sheet, rather than transcribing a screenshot. Screenshot entry stays
the fallback for a game whose replay never made it to ballchasing.

## Why it exists

Every match day's replays used to be ingested twice: automatically into the
nuanced-stats sheet, and again by hand into the tracker. The hand pass is the
riskiest step in the whole operation — a typo there silently changes every
published Player Value — and it was transcribing a subset of numbers the first
pass had already parsed correctly.

No ballchasing API token is involved, and there is no handle-mapping table. The
nuanced sheet already carries RPL's own player names, because the ingestion
skill resolves ballchasing handles on the way in.

## How to run it

```
# 1. Cowork: export the nuanced-stats sheet from Drive to data/raw/nuanced.json
#    (the connector's {"fileContent": "..."} shape, same as tracker.json)
npm run derive
```

It fails rather than guessing. It will not write anything when:

- the sheet's own Player Totals disagrees with a recount of its raw Game Log
  rows (two independent counts of the same games — a mismatch means the sheet's
  formulas are broken, which has shipped before)
- a Game Log player isn't on the roster, or a rostered player has no Player
  Totals row
- the sheet and `season2.json` disagree about which club someone plays for
- the sheet is **behind** `results.json`. These totals are cumulative, so
  entering a stale export would roll every player backwards. Ingest the missing
  replays first. `--allow-stale` overrides, and you should have a reason.

Re-running it *after* stat entry should report **0 players need updating**. That
is the cheapest possible check that the entry was typed correctly, and it's
worth doing.

## Where it sits in the match-day chain

Before stat entry, not after:

```
replays -> nuanced sheet (rpl-nuanced-stats)
        -> export to data/raw/nuanced.json   (Cowork; this repo has no Drive access)
        -> npm run derive                    <- here
        -> rpl-stat-entry confirms and writes the tracker
        -> export tracker -> npm run matchday
```

It is deliberately **not** part of `npm run matchday`. That chain runs after the
tracker is already correct, and wiring a step that depends on a hand-exported
file into it would fail builds for reasons that have nothing to do with the
build.

## Known rough edge

Getting `data/raw/nuanced.json` here is the one manual step left. The Drive
connector hands the sheet back as markdown *into a Cowork conversation*, so
writing it to disk costs a pass through the assistant each match day. Two ways
out, neither built yet:

- have `rpl-nuanced-stats` Phase B write `nuanced.json` as a by-product of the
  ingestion it is already doing — the cheapest fix, and the right one
- or read the ballchasing group over the API, which is what item 1.5 in the ops
  brainstorm was originally for

Until then it is one export per match day, and the cost lands on the assistant
rather than on Jacob.

## Committed on purpose

Each run overwrites `stat-entry.json`, and the file is committed, so the diff
history is a record of what was entered each match day and what it replaced.
