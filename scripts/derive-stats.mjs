/**
 * Derive the tracker's Season 2 stat columns from the nuanced-stats sheet.
 *
 * WHY THIS EXISTS
 * Every match day's replays currently get ingested TWICE: automatically into
 * the nuanced-stats sheet from the ballchasing group, and again by hand into
 * RPL_Master_Tracker by reading a scoreboard screenshot and typing numbers into
 * a live formula sheet. The second pass is the riskiest step in the whole
 * operation — a typo there silently changes every published Player Value — and
 * it is transcribing a subset of what the first pass already parsed correctly.
 *
 * This script closes that gap. It reads the nuanced sheet's own export and
 * produces exactly the six cumulative numbers the tracker holds per player
 * (Goals, Assists, Saves, Shots, Points, Games Played) plus the five averages,
 * diffed against what the tracker currently says. `rpl-stat-entry` then becomes
 * "here are the numbers I derived, confirm before I write" instead of a
 * transcription job. Screenshot entry stays as the fallback for a game whose
 * replay never uploaded.
 *
 * NO BALLCHASING API TOKEN IS NEEDED, and neither is a handle-mapping table.
 * The original plan for this assumed both. It turned out the nuanced sheet's
 * Player Totals tab already carries RPL's own player names — every one of the
 * 18 matches `season2.json` exactly, `on rollr` and `Killua` included — because
 * the ingestion skill maps ballchasing handles to RPL names on the way in. The
 * mapping problem is already solved upstream; this script just has to not
 * re-introduce it. If a name ever fails to match, that is a real signal (a
 * roster change, or the ingestion skill mapping a handle wrong) and it fails
 * loudly rather than dropping the player.
 *
 * TWO INDEPENDENT PATHS, DELIBERATELY
 * The totals are recomputed from the raw per-game rows in Game Log, and then
 * cross-checked against the sheet's OWN Player Totals row. Those are two
 * different computations of the same number: mine, and the spreadsheet's
 * formulas. If they disagree, the sheet's formulas are broken and this fails
 * rather than publishing either answer. That is not paranoia — the nuanced
 * sheet's leaderboards have already shipped a bug of exactly this shape (the
 * formulas were anchored to six rows after twelve players were appended, and
 * silently ignored the rest for three match days).
 *
 * USAGE
 *   node scripts/derive-stats.mjs [--allow-stale]
 *
 * INPUT  data/raw/nuanced.json   Drive export of the nuanced-stats sheet, in
 *                                the connector's {"fileContent": "..."} shape —
 *                                the same shape as data/raw/tracker.json. This
 *                                is a Cowork step; this repo has no Drive
 *                                access.
 * OUTPUT data/derived/stat-entry.json   the numbers to write, and the diff.
 *
 * Exits non-zero on anything that would make the derived numbers untrustworthy.
 * A player whose numbers simply CHANGED is the expected case, not an error.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ALLOW_STALE = process.argv.includes("--allow-stale");

const SOURCE = join(ROOT, "data/raw/nuanced.json");
const OUT_DIR = join(ROOT, "data/derived");
const OUT = join(OUT_DIR, "stat-entry.json");

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function die(message) {
  console.error(`\n  derive-stats: ${message}\n`);
  process.exit(1);
}

/* ---- markdown table reading --------------------------------------------- */

/**
 * The Drive connector renders a Sheet as a run of markdown tables, one per
 * detected block, and a tab's real header row is often NOT the markdown header
 * — a title or a merged banner takes that slot and the header lands somewhere
 * in the body. So this flattens the whole document to rows and the callers
 * anchor on the header row's CONTENT, wherever it sits. Same convention the
 * tracker parser uses, and for the same reason: row positions move whenever
 * Jacob adds a note to a tab, and header text doesn't.
 */
function allRows(markdown) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t
      .slice(1, t.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((c) => c.trim().replace(/\\(.)/g, "$1"));
    // the |:-:|:-:| separator under a markdown header carries no data
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

/** Index of the first row satisfying `match`, or -1. */
function findHeader(rows, match) {
  return rows.findIndex((r) => match(r));
}

/**
 * Rows after `headerIdx` that still belong to that table.
 *
 * "Until the first blank row" is NOT enough. Blank lines between tabs vanish
 * when the document is flattened, so the next tab's own header row sits
 * directly after the previous tab's last data row and gets swallowed as data.
 * Each caller therefore passes a predicate describing what one of ITS rows
 * looks like, and reading stops at the first row that isn't one.
 */
function bodyAfter(rows, headerIdx, isRow) {
  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    if (!rows[i][0]) break;
    if (!isRow(rows[i])) break;
    out.push(rows[i]);
  }
  return out;
}

/** Zip a body row against its header into a keyed object. */
function keyed(header, row) {
  const o = {};
  header.forEach((h, i) => {
    if (h) o[h] = row[i] ?? "";
  });
  return o;
}

/**
 * "1,442" -> 1442, "66.7%" -> 66.7, "" -> null. Anything that isn't a number
 * returns null rather than NaN, so a broken cell shows up as missing data
 * instead of poisoning a sum.
 */
function num(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/,/g, "").replace(/%$/, "").trim();
  if (s === "" || s === "-" || s === "—") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** The tracker shows averages to 2dp. Match it exactly, don't approximate. */
const avg = (total, games) =>
  games > 0 ? Math.round((total / games) * 100) / 100 : null;

/* ---- load ---------------------------------------------------------------- */

if (!existsSync(SOURCE)) {
  die(
    "data/raw/nuanced.json not found.\n" +
      "  Export the nuanced-stats sheet from Google Drive first — that's a\n" +
      "  Cowork step; this repo has no Drive access. Save the connector's\n" +
      '  {"fileContent": "..."} response to that path, same as tracker.json.'
  );
}

let sheetRaw;
try {
  sheetRaw = JSON.parse(readFileSync(SOURCE, "utf8"));
} catch {
  die("data/raw/nuanced.json is not valid JSON — re-export it.");
}
if (typeof sheetRaw?.fileContent !== "string" || !sheetRaw.fileContent) {
  die(
    'data/raw/nuanced.json has no "fileContent" string.\n' +
      "  Expected the Google Drive connector's export shape."
  );
}

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const league = read("src/data/league.json");
const season = league.currentSeason;
const seasonFile = read(`src/data/season${season}.json`);
const results = read("src/data/results.json");
const clubs = read("src/data/clubs.json").clubs;

const rows = allRows(sheetRaw.fileContent);

/* ---- locate the three tabs we need --------------------------------------- */

const gameLogIdx = findHeader(
  rows,
  (r) => r[0] === "Season" && r.includes("Player") && r.includes("Game ID")
);
const totalsIdx = findHeader(
  rows,
  (r) => r[0] === "Player" && r[1] === "Team" && r[2] === "Games"
);
const ingestIdx = findHeader(
  rows,
  (r) => r[0] === "Game ID" && r[2] === "Match Day" && r[4] === "Ingested"
);

if (gameLogIdx === -1) {
  die(
    "couldn't find the Game Log header (a row starting `Season | Match Day |\n" +
      "  Game ID` and containing `Player`) in the export. If that tab was\n" +
      "  renamed or its columns reordered, fix the anchor here — do not fall\n" +
      "  back to a row number, that's what this avoids."
  );
}
if (totalsIdx === -1) {
  die(
    "couldn't find the Player Totals header (a row starting `Player | Team |\n" +
      "  Games`) in the export."
  );
}

const gameLogHeader = rows[gameLogIdx];
const gameLog = bodyAfter(rows, gameLogIdx, (r) =>
  /^RPL Season \d+$/i.test(r[0])
).map((r) => keyed(gameLogHeader, r));

const totalsHeader = rows[totalsIdx];
const playerTotals = bodyAfter(
  rows,
  totalsIdx,
  (r) => r[0] && num(r[2]) !== null
).map((r) => keyed(totalsHeader, r));

const ingestion =
  ingestIdx === -1
    ? []
    : bodyAfter(rows, ingestIdx, (r) => /^[0-9a-f]{8}-[0-9a-f-]+$/i.test(r[0]))
        .map((r) => keyed(rows[ingestIdx], r));

if (gameLog.length === 0) {
  die(
    "found the Game Log header but read 0 rows under it. Its Season column no\n" +
      '  longer reads "RPL Season <n>" — fix the row predicate here rather than\n' +
      "  loosening it, or the next tab's header gets swallowed as data."
  );
}
if (playerTotals.length === 0) {
  die("found the Player Totals header but read 0 rows under it.");
}

if (ingestIdx === -1) {
  warn(
    "no Ingestion Log found in the export — the staleness check below is " +
      "running off Game Log match days instead."
  );
}

/* ---- identity ------------------------------------------------------------ */

const clubByName = new Map(clubs.map((c) => [c.name, c.code]));
const rostered = seasonFile.players.filter(
  (p) => p.team && (p.status === "Active" || p.status === "Exempt")
);
const bySheetName = new Map(rostered.map((p) => [p.name, p]));

// The whole point of the reframing: these names should already agree, because
// the ingestion skill resolves ballchasing handles to RPL names on the way in.
// A miss here means that resolution drifted, and silently dropping the player
// would understate his totals — so it blocks.
const STAT_KEYS = ["goals", "assists", "saves", "shots", "points", "games"];

const derived = new Map(
  rostered.map((p) => [
    p.name,
    { goals: 0, assists: 0, saves: 0, shots: 0, points: 0, games: 0 },
  ])
);

let subRowsSkipped = 0;

for (const row of gameLog) {
  const name = row["Player"];
  if (!name) continue;
  const player = bySheetName.get(name);
  if (!player) {
    fail(
      `Game Log has a player "${name}" who isn't rostered in season${season}.json. ` +
        "Either the roster changed and this repo's data is stale, or the " +
        "ingestion skill mapped a ballchasing handle to the wrong RPL name."
    );
    continue;
  }

  // THE SUB RULE, enforced here rather than trusted: a player's stats for a
  // game they subbed in for a team that isn't their own are omitted entirely,
  // credited to neither side. The sheet's own notes say Player Totals already
  // does this; recomputing it independently is what lets the cross-check below
  // mean something.
  const rowClub = clubByName.get(row["Team"]);
  if (rowClub && rowClub !== player.team) {
    subRowsSkipped += 1;
    warn(
      `sub rule: ${name} appears for ${row["Team"]} in game ` +
        `${row["Game Title"] || row["Game ID"]} but is rostered on ` +
        `${player.team} — that game is excluded from his totals, per the rule.`
    );
    continue;
  }
  if (!rowClub && row["Team"]) {
    fail(
      `Game Log references a club "${row["Team"]}" that isn't in clubs.json ` +
        `(game ${row["Game Title"] || row["Game ID"]}).`
    );
    continue;
  }

  const d = derived.get(name);
  d.games += 1;
  d.goals += num(row["Goals"]) ?? 0;
  d.assists += num(row["Assists"]) ?? 0;
  d.saves += num(row["Saves"]) ?? 0;
  d.shots += num(row["Shots"]) ?? 0;
  d.points += num(row["Score"]) ?? 0;
}

/* ---- cross-check my arithmetic against the sheet's own formulas ---------- */

const seenInTotals = new Set();

for (const t of playerTotals) {
  const name = t["Player"];
  if (!name) continue;
  seenInTotals.add(name);
  const player = bySheetName.get(name);
  if (!player) {
    fail(
      `Player Totals lists "${name}", who isn't rostered in season${season}.json.`
    );
    continue;
  }
  const code = clubByName.get(t["Team"]);
  if (code !== player.team) {
    fail(
      `${name} is on ${t["Team"]} (${code ?? "unknown club"}) in the nuanced ` +
        `sheet but ${player.team} in season${season}.json — the two sources ` +
        "disagree about the roster; fix that before trusting any of these numbers."
    );
  }

  const mine = derived.get(name);
  const theirs = {
    games: num(t["Games"]),
    goals: num(t["Goals"]),
    assists: num(t["Assists"]),
    saves: num(t["Saves"]),
    shots: num(t["Shots"]),
    points: num(t["Score"]),
  };
  for (const k of STAT_KEYS) {
    if (theirs[k] === null) {
      fail(`Player Totals has no readable ${k} for ${name}.`);
      continue;
    }
    if (theirs[k] !== mine[k]) {
      fail(
        `${name}: recomputing from Game Log gives ${k}=${mine[k]}, but the ` +
          `sheet's own Player Totals says ${theirs[k]}. Two independent counts ` +
          "of the same games disagree — the sheet's formulas are probably " +
          "broken (this exact class of bug has shipped before). Fix the sheet; " +
          "do not enter either number."
      );
    }
  }
}

for (const p of rostered) {
  if (!seenInTotals.has(p.name)) {
    fail(
      `${p.name} (${p.team}) is rostered but has no row on Player Totals. ` +
        "The sheet's leaderboard formulas are anchored to a fixed row range — " +
        "a missing row there means a player was appended without extending it."
    );
  }
}

/* ---- staleness: is the sheet caught up with the season? ------------------ */

const sheetMatchDays = [
  ...new Set(
    (ingestion.length
      ? ingestion.map((r) => num(r["Match Day"]))
      : gameLog.map((r) => num(r["Match Day"]))
    ).filter((n) => n !== null)
  ),
].sort((a, b) => a - b);

const sheetThrough = sheetMatchDays.length
  ? Math.max(...sheetMatchDays)
  : 0;
const resultsThrough = (results.matchDays ?? []).length;

if (sheetThrough < resultsThrough) {
  const msg =
    `the nuanced sheet has ingested through match day ${sheetThrough}, but ` +
    `results.json records ${resultsThrough}. These totals are CUMULATIVE, so ` +
    "entering them into the tracker would roll every player BACKWARDS. " +
    "Ingest the missing replays into the nuanced sheet first (that's the " +
    "rpl-nuanced-stats skill), then re-export and re-run.";
  if (ALLOW_STALE) warn(`${msg} (--allow-stale given, continuing anyway)`);
  else fail(msg);
}
if (sheetThrough > resultsThrough) {
  warn(
    `the nuanced sheet is through match day ${sheetThrough} but results.json ` +
      `only records ${resultsThrough} — that's fine and expected if you haven't ` +
      "logged the night's series yet, but results.json needs updating too."
  );
}

/* ---- diff against what the tracker currently holds ------------------------ */

const rowsOut = [];
let changed = 0;

for (const p of rostered) {
  const d = derived.get(p.name);
  const t = p.totals ?? {};
  const derivedRow = {
    ...d,
    avgGoals: avg(d.goals, d.games),
    avgAssists: avg(d.assists, d.games),
    avgSaves: avg(d.saves, d.games),
    avgShots: avg(d.shots, d.games),
    avgPoints: avg(d.points, d.games),
  };
  // The tracker leaves a player who has never played BLANK, not zero. Treat
  // null and 0 as the same thing when nothing has been played, so an unplayed
  // club doesn't read as 18 changes on every run.
  const trackerRow = {
    goals: t.goals ?? null,
    assists: t.assists ?? null,
    saves: t.saves ?? null,
    shots: t.shots ?? null,
    points: t.points ?? null,
    games: t.games ?? null,
  };
  const unplayed = d.games === 0 && trackerRow.games === null;
  const delta = {};
  let rowChanged = false;
  for (const k of STAT_KEYS) {
    const before = trackerRow[k];
    const diff = d[k] - (before ?? 0);
    delta[k] = diff;
    if (!unplayed && diff !== 0) rowChanged = true;
    if (!unplayed && before === null && d[k] !== 0) rowChanged = true;
  }
  if (rowChanged) changed += 1;

  rowsOut.push({
    name: p.name,
    slug: p.slug,
    team: p.team,
    played: d.games > 0,
    changed: rowChanged,
    derived: derivedRow,
    tracker: trackerRow,
    delta,
  });
}

/* ---- report -------------------------------------------------------------- */

const scope =
  `season ${season} · ${gameLog.length} game-log rows · ` +
  `${rostered.length} rostered · sheet through match day ${sheetThrough}`;

if (warnings.length) {
  console.warn(`\n  derive-stats: ${warnings.length} note(s)`);
  for (const w of warnings) console.warn(`    - ${w}`);
}

if (errors.length) {
  console.error(
    `\n  derive-stats: FAILED — ${errors.length} problem(s) (${scope})\n`
  );
  for (const e of errors) console.error(`    x ${e}`);
  console.error(
    "\n  Nothing was written. These numbers drive every published Player " +
      "Value;\n  entering them while a source disagrees is worse than " +
      "entering them late.\n"
  );
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log(`\n  derive-stats: ${scope}\n`);
console.log(
  `  ${pad("Player", 14)}${pad("Club", 5)}${padL("G", 4)}${padL("A", 4)}` +
    `${padL("Sv", 4)}${padL("Sh", 4)}${padL("Pts", 7)}${padL("GP", 4)}   change`
);
console.log(`  ${"-".repeat(70)}`);
for (const r of rowsOut) {
  const d = r.derived;
  const note = !r.played
    ? "not played"
    : r.changed
      ? STAT_KEYS.filter((k) => r.delta[k] !== 0)
          .map((k) => `${k} ${r.delta[k] > 0 ? "+" : ""}${r.delta[k]}`)
          .join(", ")
      : "—";
  console.log(
    `  ${pad(r.name, 14)}${pad(r.team, 5)}${padL(d.goals, 4)}` +
      `${padL(d.assists, 4)}${padL(d.saves, 4)}${padL(d.shots, 4)}` +
      `${padL(d.points, 7)}${padL(d.games, 4)}   ${note}`
  );
}

mkdirSync(OUT_DIR, { recursive: true });
const payload = {
  note:
    "Tracker Season 2 stat columns derived from the nuanced-stats sheet, and " +
    "diffed against what the tracker currently holds. Written by " +
    "scripts/derive-stats.mjs. rpl-stat-entry reads this and confirms before " +
    "writing; it is not authoritative on its own and is not read by the site.",
  generatedAt: new Date().toISOString(),
  season,
  source: {
    sheet: "RPL Season 2 — nuanced stats",
    matchDaysIngested: sheetMatchDays,
    gameLogRows: gameLog.length,
    subRowsSkipped,
  },
  trackerThroughMatchDay: resultsThrough,
  changedCount: changed,
  rows: rowsOut,
};
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `\n  ${changed} player(s) need updating in RPL_Master_Tracker.\n` +
    `  Wrote data/derived/stat-entry.json${
      warnings.length ? " (with notes above)" : ""
    }\n`
);
