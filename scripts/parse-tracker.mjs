/**
 * parse-tracker.mjs
 *
 * Turns the RPL_Master_Tracker export into the typed JSON the site reads.
 *
 * Input : data/raw/tracker.json  — the raw Google Drive connector export of
 *         RPL_Master_Tracker (a `{ fileContent: string }` JSON blob of markdown
 *         tables, one section per season tab).
 * Output: src/data/season1.json, src/data/season2.json, src/data/league.json
 *
 * Run:  npm run data
 *
 * NOTE: the tracker is a human-facing spreadsheet with merged cells and styled
 * headers. This parser locates tables by their header row rather than by fixed
 * line numbers so that cosmetic edits to the sheet don't break it, but a
 * *structural* change (renaming a column, reordering the player table) will.
 * If a season comes back with 0 players, that's the signal the layout moved.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = resolve(ROOT, "data/raw/tracker.json");
const OUT = resolve(ROOT, "src/data");

/** Cell text -> clean string. Strips the markdown escaping the export adds. */
function clean(s) {
  return s
    .replace(/\\\[merged\\\]/g, "")
    .replace(/\\([*_[\]\\-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function rowCells(line) {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(clean);
}

/** "$7,928" -> 7928 ; "N/A"/"" -> null */
function money(s) {
  if (!s || s === "N/A" || s === "—") return null;
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** "1.33" -> 1.33 ; "" -> null */
function num(s) {
  if (s === undefined || s === null || s === "" || s === "N/A" || s === "—") return null;
  const n = Number(String(s).replace(/[%,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A trailing asterisk on a *player name* marks a player whose Prior Value was
 * seeded from the rank baseline rather than carried from a real prior season.
 * A trailing asterisk on a *team code* marks that player as the team's manager.
 */
function splitFlag(raw) {
  const flagged = /\*\s*$/.test(raw);
  return { value: raw.replace(/\*\s*$/, "").trim(), flagged };
}

/**
 * Players to drop from the site entirely.
 *
 * Dyloz has a row in the Season 2 tracker (inactive, estimated prior value)
 * because he wanted to play and then couldn't. Confirmed by Jacob 2026-09-02:
 * he should not appear on the site at all — no profile, no mention.
 */
const EXCLUDED_PLAYERS = new Set(["Dyloz"]);

/**
 * Canonical spellings, applied after the asterisk is stripped.
 *
 * The Season 2 tab spells this player "Bl4ze the MaN"; the correct spelling,
 * and the one the Season 1 tab and the profile docs use, is "Bl4ze Th3 MaN".
 * Correcting it here is what lets both seasons resolve to one slug and one
 * player page. Worth fixing in the sheet itself so this entry can go away.
 */
const NAME_CORRECTIONS = new Map([["Bl4ze the MaN", "Bl4ze Th3 MaN"]]);

const PLAYER_HEADER = ["Player", "Team", "Rank", "Status", "Prior Value"];

function findPlayerTables(lines) {
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = rowCells(lines[i]);
    if (PLAYER_HEADER.every((h, j) => cells[j] === h)) {
      tables.push({ headerIndex: i, columns: cells });
    }
  }
  return tables;
}

function parsePlayers(lines, headerIndex, columns) {
  const col = (name) => columns.indexOf(name);
  const idx = {
    player: col("Player"),
    team: col("Team"),
    rank: col("Rank"),
    status: col("Status"),
    priorValue: col("Prior Value"),
    goals: col("Goals"),
    assists: col("Assists"),
    saves: col("Saves"),
    shots: col("Shots"),
    points: col("Points"),
    games: col("Games Played"),
    avgGoals: col("Avg Goals"),
    avgAssists: col("Avg Assists"),
    avgSaves: col("Avg Saves"),
    avgShots: col("Avg Shots"),
    avgPoints: col("Avg Points"),
    baseValue: col("Base Value"),
    vsBaseline: col("Vs Rank Baseline"),
    modifier: col("Modifier ($)"),
    seasonValue: col("Season Value"),
    weightOnPrior: col("Weight on Prior"),
    playerValue: col("Player Value"),
  };

  const players = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const c = rowCells(lines[i]);
    const rawName = c[idx.player] ?? "";

    // The player block is followed by blank spacer rows, then the next tab,
    // which the export marks with a `:-:` alignment row and a merged banner
    // (every cell in the row holding the same text). Those are the real end of
    // the table — blank rows are NOT, because the sheet leaves gaps between
    // groups of players (inactive alumni, then the active roster).
    if (c[0] === ":-:") break;
    const isMergedBanner = c[0] && c[0] === c[1] && c[1] === c[2];
    if (isMergedBanner) break;
    if (rawName === "Player") break;
    if (!rawName) continue;

    const name = splitFlag(rawName);
    const canonical = NAME_CORRECTIONS.get(name.value) ?? name.value;
    if (EXCLUDED_PLAYERS.has(canonical)) continue;
    const team = splitFlag(c[idx.team] ?? "");

    players.push({
      name: canonical,
      slug: slugify(canonical),
      estimatedPriorValue: name.flagged,
      team: team.value || null,
      isManager: team.flagged,
      rank: c[idx.rank] || null,
      status: c[idx.status] || null,
      priorValue: money(c[idx.priorValue]),
      totals: {
        goals: num(c[idx.goals]),
        assists: num(c[idx.assists]),
        saves: num(c[idx.saves]),
        shots: num(c[idx.shots]),
        points: num(c[idx.points]),
        games: num(c[idx.games]),
      },
      averages: {
        goals: num(c[idx.avgGoals]),
        assists: num(c[idx.avgAssists]),
        saves: num(c[idx.avgSaves]),
        shots: num(c[idx.avgShots]),
        points: num(c[idx.avgPoints]),
      },
      valuation: {
        baseValue: money(c[idx.baseValue]),
        vsRankBaselinePct: num(c[idx.vsBaseline]),
        modifier: money(c[idx.modifier]),
        seasonValue: money(c[idx.seasonValue]),
        weightOnPriorPct: num(c[idx.weightOnPrior]),
        playerValue: money(c[idx.playerValue]),
      },
    });
  }
  return players;
}

function main() {
  const raw = JSON.parse(readFileSync(RAW, "utf8"));
  const content = raw.fileContent ?? raw;
  const lines = content.split("\n");

  const tables = findPlayerTables(lines);
  if (tables.length === 0) {
    throw new Error(
      "No player table found. The tracker's column headers have moved — " +
        "check that a row still reads Player | Team | Rank | Status | Prior Value."
    );
  }

  const seasons = tables.map((t, i) => ({
    season: i + 1,
    players: parsePlayers(lines, t.headerIndex, t.columns),
  }));

  mkdirSync(OUT, { recursive: true });

  for (const s of seasons) {
    const file = resolve(OUT, `season${s.season}.json`);
    writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
    console.log(`season${s.season}.json — ${s.players.length} players`);
    if (s.players.length === 0) {
      console.warn(`  ! season ${s.season} parsed 0 players — sheet layout may have changed`);
    }
  }

  const latest = seasons[seasons.length - 1];
  writeFileSync(
    resolve(OUT, "league.json"),
    JSON.stringify(
      {
        currentSeason: latest.season,
        seasons: seasons.map((s) => s.season),
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`league.json — current season ${latest.season}`);
}

main();
