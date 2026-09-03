/**
 * build-recaps.mjs
 *
 * Turns match day recap drafts into the public recap content the site renders.
 *
 * Input : data/raw/recaps/<name>.md  — drafted from the RPL OPS project docs.
 *         GITIGNORED, for the same reason the profile sources are: the drafts
 *         are written against internal notes and shouldn't live in the repo.
 * Output: src/data/recaps.json       — public content only, committed.
 *
 * Run:  npm run recaps
 *
 * WHAT GETS STRIPPED, and why:
 *
 * - Schedule lineup and day-number references. The pool in schedule.json has no
 *   order and no numbers; a draft that reconciles "which day of the pool got
 *   played" is internal bookkeeping and contradicts what the rest of the site
 *   says. Match Day numbers are fine — those are the order nights were actually
 *   played, which is exactly what a recap is about.
 * - References to documents in the Claude project (`claude/...`) or memory
 *   (`/areas/...`), which point at files no reader can open.
 * - Sourcing attributions naming the internal sheets and tabs a number came
 *   from. The number is publishable; its provenance is not. The ballchasing
 *   methodology caveat is deliberately NOT in this category — that one is
 *   honest and useful to a reader, so it stays.
 *
 * The script FAILS rather than publishing if any of those survive, and also if
 * a player link points at a slug that doesn't exist — a dead link in a recap is
 * a bad look and is trivially checkable here.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import season1 from "../src/data/season1.json" with { type: "json" };
import season2 from "../src/data/season2.json" with { type: "json" };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IN = resolve(ROOT, "data/raw/recaps");
const OUT = resolve(ROOT, "src/data/recaps.json");

/** Every slug a recap is allowed to link to. */
const SLUGS = new Set(
  [...season1.players, ...season2.players].map((p) => p.slug)
);

/** Nothing in the published output may match these. */
const LEAK_PATTERNS = [
  { pattern: /claude\//i, label: "internal document reference" },
  { pattern: /\/areas\//i, label: "memory path" },
  { pattern: /\bJacob\b/, label: "Jacob by name" },
  { pattern: /\.md\b/, label: "leftover document filename" },
  { pattern: /RPL_Master_Tracker/i, label: "internal sheet name" },
  { pattern: /to fill in/i, label: "TODO marker" },
  // Lineup numbering. "Match Day 3" is legitimate — it's the order nights were
  // played — so it's excluded by the lookbehind; a bare "Day 3" or "lineup 3"
  // is the pool bookkeeping the site never surfaces.
  { pattern: /(?<!match )\bday\s+\d+\b/i, label: "schedule day number" },
  { pattern: /\blineups?\s+#?\d+\b/i, label: "schedule lineup number" },
  { pattern: /\b\d+-day pool\b/i, label: "schedule pool reference" },
];

/**
 * Frontmatter, in the small subset the recaps use: quoted and bare scalars,
 * numbers, booleans, null, and flat `[A, B]` lists. Enough for the fields in
 * the table in HANDOFF.md, and it fails loudly on anything it can't read
 * rather than guessing.
 */
function parseFrontmatter(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`${file}: no frontmatter block`);

  const fields = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) throw new Error(`${file}: can't read frontmatter line: ${line}`);
    fields[kv[1]] = parseValue(stripComment(kv[2]).trim(), file, kv[1]);
  }

  return { fields, body: raw.slice(match[0].length) };
}

/** Trailing ` # comment`, but not a `#` inside a quoted value. */
function stripComment(value) {
  if (value.startsWith('"') || value.startsWith("'")) {
    const quote = value[0];
    const end = value.indexOf(quote, 1);
    return end === -1 ? value : value.slice(0, end + 1);
  }
  return value.replace(/\s+#.*$/, "");
}

function parseValue(value, file, key) {
  if (value === "" || value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return value.slice(1, -1);
  if (/^\[.*\]$/.test(value)) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  // Dates stay strings; only a plain integer becomes a number.
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d/.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${file}: unreadable value for ${key}: ${value}`);
  }
  return value;
}

function stripInternalRefs(text) {
  return (
    text
      // Document and memory references, removed before any sentence-level
      // cleanup so the periods inside a filename can't strand a fragment.
      .replace(/`(?:claude\/|\/areas\/)[^`]+`/g, "")
      // Sourcing attributions naming an internal sheet or tab.
      .replace(/\s*\((?:per\s+|from\s+|source:\s*)?(?:the\s+)?(?:RPL_Master_Tracker|tracker|nuanced[^)]*|Season\s*\d+\s*tab)\)/gi, "")
      .replace(/\s*—?\s*(?:per|source|sourced from|confirmed by)\s+(?:the\s+)?(?:RPL_Master_Tracker|tracker sheet|nuanced sheet)\b[^.,;]*/gi, "")
      // Clean up what those removals left behind: an empty parenthetical, a
      // "See for context." with its subject gone, and stranded punctuation.
      .replace(/\s*\((?:\s*(?:full recap|see|source)\s*:)?\s*\)/gi, "")
      .replace(/\s*(?:See|see)\s+(?:for|and|,)[^.]*\./g, "")
      .replace(/\s+(?:and|,)\s*\./g, ".")
      .replace(/\s+([.,;])/g, "$1")
      .replace(/([,;])\s*\./g, ".")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function required(fields, key, file) {
  const value = fields[key];
  if (value === null || value === undefined || value === "") {
    throw new Error(`${file}: missing required frontmatter field \`${key}\``);
  }
  return value;
}

function main() {
  if (!existsSync(IN)) {
    throw new Error(
      `No recap source at ${IN}. These are gitignored — drop the match day ` +
        `markdown in there before running this.`
    );
  }

  const files = readdirSync(IN).filter((f) => f.endsWith(".md"));
  const recaps = [];

  for (const file of files) {
    const { fields, body } = parseFrontmatter(
      readFileSync(resolve(IN, file), "utf8"),
      file
    );

    recaps.push({
      matchDay: required(fields, "matchDay", file),
      date: required(fields, "date", file),
      title: required(fields, "title", file),
      subtitle: fields.subtitle ?? null,
      headline: required(fields, "headline", file),
      teamsPlayed: fields.teamsPlayed ?? [],
      teamsOnBye: fields.teamsOnBye ?? [],
      html: marked.parse(stripInternalRefs(body)),
    });
  }

  // Newest first — the order every view wants, settled once here.
  recaps.sort((a, b) => b.matchDay - a.matchDay);

  const failures = [];

  const seen = new Set();
  for (const recap of recaps) {
    if (seen.has(recap.matchDay)) {
      failures.push(`two recaps claim Match Day ${recap.matchDay}`);
    }
    seen.add(recap.matchDay);

    const blob = `${recap.title}\n${recap.subtitle ?? ""}\n${recap.headline}\n${recap.html}`;
    for (const { pattern, label } of LEAK_PATTERNS) {
      const hit = blob.match(pattern);
      if (hit) failures.push(`match-day-${recap.matchDay}: ${label} — "${hit[0]}"`);
    }

    for (const [, slug] of blob.matchAll(/\/players\/([a-z0-9-]+)/g)) {
      if (!SLUGS.has(slug)) {
        failures.push(`match-day-${recap.matchDay}: dead player link /players/${slug}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      "Recaps not written:\n  " +
        failures.join("\n  ") +
        "\nFix the draft, or the rules in scripts/build-recaps.mjs, and rerun."
    );
  }

  writeFileSync(OUT, JSON.stringify({ recaps }, null, 2) + "\n");
  console.log(
    `recaps.json — ${recaps.length} match day${recaps.length === 1 ? "" : "s"}, ` +
      `newest first (Match Day ${recaps[0]?.matchDay ?? "—"})`
  );
}

main();
