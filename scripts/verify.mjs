/**
 * Data integrity checks for the committed league data.
 *
 * WHY THIS EXISTS
 * Almost everything the site publishes is computed from a handful of
 * hand-maintained JSON files. A typo in results.json doesn't crash a build —
 * it silently publishes a wrong standings table, and nobody notices until
 * someone argues about it in Discord. Two bugs of exactly this shape have
 * already happened (the nuanced sheet's leaderboards ranking 6 of 18 players
 * after a roster change; roster codes drifting out of sync).
 *
 * Wired in as `prebuild`, so it runs before every `npm run build` — including
 * Vercel's. Bad data fails the deploy instead of shipping.
 *
 * Failures block. Warnings are printed and do not.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/** The canonical club list. Read straight from JSON — no parsing to break. */
function loadTeams() {
  return read("src/data/clubs.json").clubs ?? [];
}

const league = read("src/data/league.json");
const season = league.currentSeason;
const players = read(`src/data/season${season}.json`).players;
const results = read("src/data/results.json");
const schedule = read("src/data/schedule.json");
const draft = read("src/data/draft.json");
const teams = loadTeams();

if (teams.length === 0) {
  fail("clubs.json: no clubs listed — the club registry is empty or malformed");
}

// Clubs playing this season. NOTE: a club in clubs.json belongs to exactly one
// season, and clubs that played in more than one are registered under the
// latest. So the authority on "who is playing now" is the players' own team
// codes, not teamsForSeason(). See the note in teams.ts.
const rostered = players.filter(
  (p) => p.team && (p.status === "Active" || p.status === "Exempt")
);
const clubCodes = [...new Set(rostered.map((p) => p.team))].sort();
const knownCodes = new Set(teams.map((t) => t.code));
const bySlug = new Map(players.map((p) => [p.slug, p]));

// Colour discipline. A club with no accent falls back to a CSS variable, which
// breaks anything that renders outside a browser — exactly what killed the
// Open Graph build. Only clubs actually playing need one, so a colourless
// Season 1 club is fine and warns nothing.
for (const club of teams) {
  if (club.accent && !/^#[0-9a-f]{3,8}$/i.test(club.accent)) {
    fail(`clubs.json: ${club.code} has accent "${club.accent}", not a hex colour`);
  }
  if (!club.accent && clubCodes.includes(club.code)) {
    warn(
      `clubs.json: ${club.code} is rostered this season but has no accent — ` +
        "it falls back to the neutral chrome colour everywhere"
    );
  }
}

/* ---- rosters ------------------------------------------------------------ */

for (const code of clubCodes) {
  const squad = rostered.filter((p) => p.team === code);
  if (squad.length !== 3) {
    fail(
      `roster: ${code} has ${squad.length} rostered players, expected 3 ` +
        `(${squad.map((p) => p.name).join(", ") || "none"})`
    );
  }
  if (!knownCodes.has(code)) {
    fail(`teams: club code "${code}" is on a roster but not in clubs.json`);
  }
  const managers = squad.filter((p) => p.isManager);
  if (managers.length !== 1) {
    warn(
      `roster: ${code} has ${managers.length} managers, expected 1 ` +
        "(the asterisk convention in the tracker's Team column is fragile — " +
        "Sheets autocomplete has corrupted it before)"
    );
  }
}

if (clubCodes.length !== schedule.format.teams) {
  fail(
    `roster: ${clubCodes.length} clubs have rosters but schedule.json says ` +
      `${schedule.format.teams}`
  );
}

/* ---- results ------------------------------------------------------------ */

const pairKey = (a, b) => [a, b].sort().join("-");
const playedPairs = [];

for (const day of results.matchDays ?? []) {
  const label = `match day ${day.matchDay}`;

  for (const code of [...(day.bye ?? [])]) {
    if (!clubCodes.includes(code)) {
      fail(`results: ${label} bye lists unknown club "${code}"`);
    }
  }

  const expectedSeries = schedule.format.seriesPerDay;
  if (day.series.length !== expectedSeries) {
    fail(
      `results: ${label} has ${day.series.length} series, expected ${expectedSeries}`
    );
  }

  const seen = new Set();
  for (const s of day.series) {
    for (const code of [s.home, s.away]) {
      if (!clubCodes.includes(code)) {
        fail(`results: ${label} references unknown club "${code}"`);
      }
      if (seen.has(code)) {
        fail(`results: ${label} has ${code} playing twice in one night`);
      }
      seen.add(code);
    }
    if (s.home === s.away) {
      fail(`results: ${label} has ${s.home} playing itself`);
    }
    playedPairs.push(pairKey(s.home, s.away));

    // Bo3/Bo7: the winner must actually have won more games.
    let home = 0;
    let away = 0;
    for (const g of s.games) {
      if (g.home === g.away) {
        fail(`results: ${label} ${s.home} v ${s.away} game ${g.game} is a draw`);
      }
      if (g.home > g.away) home += 1;
      else away += 1;
    }
    const winner = home > away ? s.home : s.away;
    if (s.winner !== winner) {
      fail(
        `results: ${label} ${s.home} v ${s.away} records winner "${s.winner}" ` +
          `but the games say ${winner} (${home}-${away})`
      );
    }
    const needed = Math.floor(s.games.length / 2) + 1;
    if (Math.max(home, away) < needed) {
      warn(
        `results: ${label} ${s.home} v ${s.away} ended ${home}-${away} — ` +
          "nobody reached a majority of the games played"
      );
    }
  }

  const byes = day.bye?.length ?? 0;
  if (byes !== schedule.format.teamsOnByePerDay) {
    fail(
      `results: ${label} has ${byes} clubs on bye, expected ` +
        `${schedule.format.teamsOnByePerDay}`
    );
  }
  if (seen.size + byes !== clubCodes.length) {
    fail(
      `results: ${label} accounts for ${seen.size + byes} clubs, but the league ` +
        `has ${clubCodes.length}`
    );
  }
}

/* ---- schedule: the double round robin invariant -------------------------- */

const poolCount = new Map();
for (const lineup of schedule.lineups) {
  for (const [a, b] of lineup.series) {
    const k = pairKey(a, b);
    poolCount.set(k, (poolCount.get(k) ?? 0) + 1);
  }
}

for (const [pair, n] of poolCount) {
  if (n !== 2) {
    fail(
      `schedule: ${pair} appears ${n} time(s) in the lineup pool, expected 2 ` +
        "(double round robin)"
    );
  }
}

const expectedPairs = (clubCodes.length * (clubCodes.length - 1)) / 2;
if (poolCount.size !== expectedPairs) {
  fail(
    `schedule: pool covers ${poolCount.size} distinct matchups, expected ` +
      `${expectedPairs} for ${clubCodes.length} clubs`
  );
}

for (const pair of new Set(playedPairs)) {
  const played = playedPairs.filter((p) => p === pair).length;
  const owed = poolCount.get(pair) ?? 0;
  if (played > owed) {
    fail(
      `schedule: ${pair} has been played ${played} times but the pool only ` +
        `owes ${owed}`
    );
  }
}

/* ---- draft --------------------------------------------------------------- */

if (draft.season === season) {
  if (draft.picks.length !== rostered.length) {
    fail(
      `draft: ${draft.picks.length} picks but ${rostered.length} rostered players`
    );
  }
  const spend = new Map();
  for (const pick of draft.picks) {
    const player = bySlug.get(pick.slug);
    if (!player) {
      fail(`draft: pick "${pick.slug}" doesn't match any player in the season file`);
      continue;
    }
    if (player.team !== pick.team) {
      fail(
        `draft: ${player.name} is listed on ${pick.team} in draft.json but ` +
          `${player.team} in the season file`
      );
    }
    if (pick.captain && player.priorValue !== pick.paid) {
      fail(
        `draft: captain ${player.name} should be auto-drafted at his own value ` +
          `(${player.priorValue}) but draft.json says ${pick.paid}`
      );
    }
    spend.set(pick.team, (spend.get(pick.team) ?? 0) + pick.paid);
  }
  for (const [code, total] of spend) {
    if (total > draft.salaryCap) {
      fail(
        `draft: ${code} spent ${total}, over the ${draft.salaryCap} cap by ` +
          `${total - draft.salaryCap}`
      );
    }
  }
}

/* ---- cross-check: games played ------------------------------------------- */

const gamesByClub = new Map();
for (const day of results.matchDays ?? []) {
  for (const s of day.series) {
    for (const code of [s.home, s.away]) {
      gamesByClub.set(code, (gamesByClub.get(code) ?? 0) + s.games.length);
    }
  }
}
for (const [code, expected] of gamesByClub) {
  for (const p of rostered.filter((x) => x.team === code)) {
    const actual = p.totals.games ?? 0;
    if (actual !== expected) {
      warn(
        `stats: ${p.name} (${code}) has ${actual} games in the tracker but ` +
          `results.json implies ${expected} — a sub, a missed stat entry, or a ` +
          "results.json typo"
      );
    }
  }
}

/* ---- report -------------------------------------------------------------- */

const scope =
  `season ${season} · ${clubCodes.length} clubs · ${rostered.length} players · ` +
  `${(results.matchDays ?? []).length} match days`;

if (warnings.length) {
  console.warn(`\n  verify: ${warnings.length} warning(s)`);
  for (const w of warnings) console.warn(`    - ${w}`);
}

if (errors.length) {
  console.error(`\n  verify: FAILED — ${errors.length} problem(s) (${scope})\n`);
  for (const e of errors) console.error(`    x ${e}`);
  console.error("");
  process.exit(1);
}

console.log(`  verify: ok — ${scope}${warnings.length ? " (with warnings)" : ""}`);
