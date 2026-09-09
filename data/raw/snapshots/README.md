# Tracker snapshots

Dated, append-only captures of **RPL_Master_Tracker** (Drive id
`10UJgkD8qTViTfeB61YtWLNVP4YvPcqs79URWG6JeX6I`).

`data/raw/tracker.json` is overwritten on every export, so without this folder the
league permanently loses what every player was worth before the most recent refresh.
These files are the history.

## Why this exists

Three payoffs from one habit:

1. **Value history.** Player Value only ever exists elsewhere as a *current* snapshot.
   These files are what a future `value-history.json` gets built from — risers and
   fallers, per-player value charts, draft ROI over time, "most improved over the last
   N match days." None of that is reconstructible after the fact; it has to be captured
   as it happens.
2. **Backup.** The tracker is a live Google Sheet with hand-entered formulas and at
   least one manually pinned value (LLellum's `$15,000`). This folder is its version
   history.
3. **Audit trail.** "Why did this number change" becomes a diff instead of a memory
   test.

## Format

Each snapshot is exactly the shape of `data/raw/tracker.json`:

```json
{ "fileContent": "<the whole sheet, as markdown tables>" }
```

So anything that can parse `tracker.json` can parse a snapshot with no changes.
`scripts/parse-tracker.mjs` finds the player table by its header row, which means it
works on old snapshots too, as long as the sheet's *columns* haven't been renamed or
reordered since. (Restyling is safe; renaming columns is not — that's true of the live
parse as well.)

`index.json` is the manifest: one entry per snapshot with the capture date, the season,
which match day it runs through, size and a sha256. **A value-history builder should
read `index.json`, not glob the directory** — the manifest is what carries
`throughMatchDay`, which the filename does not.

## Convention

- One snapshot per match day, taken **right after** that match day's stats are logged
  to the tracker. That's the moment the numbers are worth preserving.
- Filename is the capture date: `tracker-YYYY-MM-DD.json`. If a second snapshot is
  needed on the same date, append `-2`.
- Never edit or delete a snapshot. Append only — a corrected value belongs in a new
  snapshot, not a rewritten old one.
- Add a matching entry to `index.json` in the same pass. A snapshot that isn't in the
  manifest is invisible to everything downstream.

## Taking one

Today this is manual: export the tracker through the Google Drive connector (a Cowork
session can do it — Claude Code has no Drive access) and write the result here.

The intended end state is that `npm run data` does it automatically — writing
`data/raw/tracker.json` as it does now *and* appending a dated copy here plus a
manifest entry, so the history accumulates without anyone remembering to. That's a
Claude Code job; see `claude/rpl-ops-brainstorm.md` (item 0.1) in the RPL OPS project.

Until then, the manual capture is what keeps the history unbroken — and a manual
snapshot taken on time is worth more than an automated one built later.
