/**
 * verify.mjs
 *
 * Data-integrity gate. Reads the shipped JSON in src/data plus the team
 * registry, prints every problem it finds, and exits 1 if any are fatal.
 *
 * Wired in as `prebuild`, so it runs on every `npm run build` — which makes
 * Vercel itself the gate, with no CI config to maintain. A bad hand edit to
 * results.json or draft.json fails the deploy instead of publishing a wrong
 * standings table.
 *
 * Fatal vs. warning: fatal is "this JSON contradicts itself or the registry",
 * which is always a mistake. The games-played cross-check only warns, because
 * the tracker legitimately lags results.json between a match night and the next
 * `npm run data` — and a player can miss a night his club played.
 *
 * The remaining-lineups walk below duplicates `remainingLineups()` from
 * src/lib/season.ts. That is deliberate: importing TypeScript here would mean
 * adding a transpiler to run a ten-line loop.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import season1 from "../src/data/season1.json" with { type: "json" };
import season2 from "../src/data/season2.json" with { type: "json" };
import league from "../src/data/league.json" with { type: "json" };
import results from "../src/data/results.json" with { type: "json" };
import schedule from "../src/data/schedule.json" with { type: "json" };
import draft from "../src/data/draft.json" with { type: "json" };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEASON_FILES = { 1: season1, 2: season2 };
const CURRENT_SEASON = league.currentSeason;
const season = SEASON_FILES[CURRENT_SEASON];

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

if (!season) {
  console.error(`FAIL  league.json: currentSeason ${CURRENT_SEASON} has no season file`);
  process.exit(1);
}

/* --------------------------------------------------------------- registry */

// teams.ts is TypeScript, so the registry is read with a regex rather than
// imported — a transpiler is a lot of machinery for one literal array. If the
// shape of that array changes this parses to nothing, which is fatal below.
const teamsSrc = readFileSync(resolve(ROOT, "src/lib/teams.ts"), "utf8");
const TEAMS = [
  ...teamsSrc.matchAll(
    /\{\s*code:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*season:\s*(\d+)/g
  ),
].map(([, code, name, slug, s]) => ({ code, name, slug, season: Number(s) }));

if (TEAMS.length === 0) {
  fail("teams.ts: parsed 0 teams — the TEAMS literal moved, fix the pattern here");
}
const CODES = new Set(TEAMS.map((t) => t.code));
const CURRENT_CODES = new Set(
  TEAMS.filter((t) => t.season === CURRENT_SEASON).map((t) => t.code)
);

function checkCode(code, where) {
  if (!CODES.has(code)) fail(`${where}: unknown team code "${code}"`);
  else if (!CURRENT_CODES.has(code))
    warn(`${where}: "${code}" belongs to another season, not Season ${CURRENT_SEASON}`);
}

for (const day of results.matchDays) {
  for (const s of day.series) {
    checkCode(s.home, `results match day ${day.matchDay}`);
    checkCode(s.away, `results match day ${day.matchDay}`);
    checkCode(s.winner, `results match day ${day.matchDay} winner`);
  }
  for (const code of day.bye) checkCode(code, `results match day ${day.matchDay} bye`);
}
for (const [i, lineup] of schedule.lineups.entries()) {
  for (const [home, away] of lineup.series) {
    checkCode(home, `schedule lineup ${i + 1}`);
    checkCode(away, `schedule lineup ${i + 1}`);
  }
  for (const code of lineup.bye) checkCode(code, `schedule lineup ${i + 1} bye`);
}
for (const pick of draft.picks) checkCode(pick.team, `draft pick ${pick.slug}`);

/* ---------------------------------------------------------------- rosters */

// Exempt counts as rostered — LLellum is exempt from valuation, not from the
// club. Filtering on Active alone would report his club a man short.
const ROSTERED = new Set(["Active", "Exempt"]);
for (const code of CURRENT_CODES) {
  const squad = season.players.filter(
    (p) => p.team === code && ROSTERED.has(p.status)
  );
  if (squad.length !== 3) {
    const who = squad.length ? ` (${squad.map((p) => p.name).join(", ")})` : "";
    fail(`roster: ${code} has ${squad.length} rostered players, expected 3${who}`);
  }
}

/* ------------------------------------------------ players named in results */

// Series summaries name players in prose, so there is nothing structured to
// join on. Known player and club names are stripped out, and whatever is left
// that still looks like a gamertag — a digit in it, or a capital that is not
// the first letter — is a name the season file does not know. Add to IGNORE if
// a piece of ordinary copy ever trips it.
const IGNORE = new Set(["Bo3", "Bo5", "RPL", "OT", "MVP", "GG"]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STRIP = [
  ...season.players
    .map((p) => p.name)
    .sort((a, b) => b.length - a.length)
    .map((n) => new RegExp(esc(n), "gi")),
  ...[...TEAMS]
    .sort((a, b) => b.name.length - a.name.length)
    .map((t) => new RegExp(esc(t.name), "gi")),
  ...TEAMS.map((t) => new RegExp(`\\b${esc(t.code)}\\b`, "g")),
];

for (const day of results.matchDays) {
  for (const s of day.series) {
    if (!s.summary) continue;
    let text = s.summary;
    for (const re of STRIP) text = text.replace(re, " ");
    for (const word of text.split(/[^A-Za-z0-9]+/)) {
      if (!word || IGNORE.has(word)) continue;
      if (/[A-Za-z]/.test(word) && (/\d/.test(word) || /.[A-Z]/.test(word)))
        fail(
          `results match day ${day.matchDay} (${s.home} v ${s.away}): summary names ` +
            `"${word}", which is not a Season ${CURRENT_SEASON} player`
        );
    }
  }
}

/* -------------------------------------------------------- match day shape */

for (const day of results.matchDays) {
  if (day.series.length !== schedule.format.seriesPerDay)
    fail(
      `results match day ${day.matchDay}: ${day.series.length} series, ` +
        `schedule format says ${schedule.format.seriesPerDay}`
    );
  if (day.bye.length !== schedule.format.teamsOnByePerDay)
    fail(
      `results match day ${day.matchDay}: ${day.bye.length} teams on bye, ` +
        `schedule format says ${schedule.format.teamsOnByePerDay}`
    );
  for (const s of day.series) {
    const label = `results match day ${day.matchDay} (${s.home} v ${s.away})`;
    if (s.games.length < 2 || s.games.length > 3)
      fail(`${label}: ${s.games.length} games logged in a Bo3`);
    const homeWins = s.games.filter((g) => g.home > g.away).length;
    const awayWins = s.games.length - homeWins;
    if (homeWins === awayWins) {
      fail(`${label}: games are level at ${homeWins}-${awayWins}, so nobody won it`);
    } else {
      const won = homeWins > awayWins ? s.home : s.away;
      if (won !== s.winner)
        fail(`${label}: winner is recorded as "${s.winner}" but the games say ${won}`);
    }
  }
}

/* --------------------------------- double round robin: each pairing twice */

const pairKey = (a, b) => [a, b].sort().join("+");
const lineupKey = (pairs) =>
  pairs
    .map(([a, b]) => pairKey(a, b))
    .sort()
    .join("|");

// Same retire-by-pairings walk as remainingLineups().
const pool = [...schedule.lineups];
for (const day of results.matchDays) {
  const key = lineupKey(day.series.map((s) => [s.home, s.away]));
  const i = pool.findIndex((l) => lineupKey(l.series) === key);
  if (i !== -1) pool.splice(i, 1);
}

const pairCount = new Map();
const bump = (a, b) => {
  const key = pairKey(a, b);
  pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
};
for (const day of results.matchDays) for (const s of day.series) bump(s.home, s.away);
for (const lineup of pool) for (const [a, b] of lineup.series) bump(a, b);

for (const [pair, n] of pairCount) {
  if (n > 2)
    fail(
      `schedule: ${pair.replace("+", " v ")} appears ${n} times across played results ` +
        `and remaining lineups — a double round robin allows 2`
    );
}

/* ------------------------------------------------------------------ draft */

const bySlug = new Map(season.players.map((p) => [p.slug, p]));
if (draft.picks.length !== 18)
  fail(`draft: ${draft.picks.length} picks, expected 18 (6 clubs x 3)`);
for (const pick of draft.picks) {
  if (!bySlug.has(pick.slug))
    fail(`draft: pick "${pick.slug}" has no player in season${CURRENT_SEASON}.json`);
}

// Cap remaining is derived (cap - spent), so the assertion that carries
// information is that no club spent past the cap.
const spendByClub = new Map();
for (const pick of draft.picks)
  spendByClub.set(pick.team, (spendByClub.get(pick.team) ?? 0) + pick.paid);
for (const [code, spent] of spendByClub) {
  const left = draft.salaryCap - spent;
  if (left < 0)
    fail(
      `draft: ${code} spent $${spent.toLocaleString()}, ` +
        `$${(-left).toLocaleString()} over the $${draft.salaryCap.toLocaleString()} cap`
    );
}

/* ------------------------------------------- games played (warning only) */

const gamesByClub = new Map();
for (const day of results.matchDays) {
  for (const s of day.series) {
    gamesByClub.set(s.home, (gamesByClub.get(s.home) ?? 0) + s.games.length);
    gamesByClub.set(s.away, (gamesByClub.get(s.away) ?? 0) + s.games.length);
  }
}
for (const p of season.players) {
  const expected = gamesByClub.get(p.team) ?? 0;
  const actual = p.totals.games ?? 0;
  if (actual !== expected)
    warn(
      `${p.name} (${p.team ?? "no club"}): season file says ${actual} games, ` +
        `results.json implies ${expected}`
    );
}

/* ----------------------------------------------------------------- report */

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`FAIL  ${e}`);

const counted = `${season.players.length} players, ${results.matchDays.length} match days, ${draft.picks.length} picks`;
if (errors.length) {
  console.error(
    `\nverify: ${errors.length} fatal, ${warnings.length} warning(s) — ${counted}`
  );
  process.exit(1);
}
console.log(`verify: OK — ${counted}, ${warnings.length} warning(s)`);
