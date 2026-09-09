/**
 * Append a dated snapshot of the tracker export to data/raw/snapshots/.
 *
 * WHY THIS EXISTS
 * data/raw/tracker.json is overwritten on every export, so without this the
 * league permanently loses what every player was worth before the most recent
 * refresh. Player Value only ever exists elsewhere as a *current* snapshot;
 * these files are the history that "risers and fallers", per-player value
 * charts and "most improved over the last N match days" all need. They are
 * also the tracker's only backup — it's a live Google Sheet with hand-entered
 * formulas and at least one manually pinned value.
 *
 * It runs as the first step of `npm run matchday`, before the parse, so what
 * gets recorded is exactly the input the rest of the pipeline consumed.
 *
 * IDEMPOTENT: if the newest snapshot already has identical content, this does
 * nothing. Running the pipeline twice in a day can't create a duplicate, and
 * running it without a fresh export can't create a misleading one.
 *
 * Snapshots are append-only. Never edit or delete one — a corrected value
 * belongs in a new snapshot, not a rewritten old one.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "data/raw/tracker.json");
const DIR = join(ROOT, "data/raw/snapshots");
const INDEX = join(DIR, "index.json");

const SOURCE_FILE_ID = "10UJgkD8qTViTfeB61YtWLNVP4YvPcqs79URWG6JeX6I";
const SOURCE_FILE_NAME = "RPL_Master_Tracker";

function fail(message) {
  console.error(`\n  snapshot: ${message}\n`);
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  fail(
    "data/raw/tracker.json not found.\n" +
      "  Export the tracker from Google Drive first — that's a Cowork step;\n" +
      "  this repo has no Drive access."
  );
}

const raw = readFileSync(SOURCE);
let parsed;
try {
  parsed = JSON.parse(raw.toString("utf8"));
} catch {
  fail("data/raw/tracker.json is not valid JSON — re-export it.");
}
if (typeof parsed?.fileContent !== "string" || parsed.fileContent.length === 0) {
  fail(
    'data/raw/tracker.json has no "fileContent" string.\n' +
      "  Expected the Google Drive connector's export shape."
  );
}

const sha256 = createHash("sha256").update(raw).digest("hex");

mkdirSync(DIR, { recursive: true });

const manifest = existsSync(INDEX)
  ? JSON.parse(readFileSync(INDEX, "utf8"))
  : {
      note:
        'Dated snapshots of RPL_Master_Tracker. Each file has the same shape as data/raw/tracker.json ({"fileContent": "<sheet as markdown>"}), so anything that can parse tracker.json can parse a snapshot. This manifest is the index a value-history builder should read.',
      sourceFileId: SOURCE_FILE_ID,
      sourceFileName: SOURCE_FILE_NAME,
      snapshots: [],
    };

const newest = manifest.snapshots[manifest.snapshots.length - 1];
if (newest?.sha256 === sha256) {
  console.log(
    `  snapshot: unchanged since ${newest.file} — nothing recorded.\n` +
      "            (Re-export the tracker if you expected a new one.)"
  );
  process.exit(0);
}

// Season and match-day come from the repo's own data, so a snapshot is
// self-describing — the filename carries the date and nothing else.
const league = JSON.parse(readFileSync(join(ROOT, "src/data/league.json"), "utf8"));
const results = JSON.parse(readFileSync(join(ROOT, "src/data/results.json"), "utf8"));
const season = league.currentSeason;
const throughMatchDay = Array.isArray(results.matchDays)
  ? results.matchDays.length
  : 0;

const date = new Date().toISOString().slice(0, 10);
let file = `tracker-${date}.json`;
let n = 1;
while (existsSync(join(DIR, file))) {
  n += 1;
  file = `tracker-${date}-${n}.json`;
}

writeFileSync(join(DIR, file), raw);
manifest.snapshots.push({
  file,
  capturedAt: date,
  season,
  throughMatchDay,
  bytes: raw.length,
  sha256,
  capturedBy: "npm run matchday",
});
writeFileSync(INDEX, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `  snapshot: ${file} — season ${season}, through match day ${throughMatchDay}` +
    ` (${manifest.snapshots.length} total)`
);

if (throughMatchDay === 0) {
  console.warn(
    "  snapshot: results.json has no match days yet, so this is recorded as\n" +
      "            through match day 0. If you just played one, log it in\n" +
      "            results.json and the NEXT snapshot will be labelled right."
  );
}
