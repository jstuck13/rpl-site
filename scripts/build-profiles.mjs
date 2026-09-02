/**
 * build-profiles.mjs
 *
 * Turns Jacob's player profile documents into the public profile content the
 * site renders.
 *
 * Input : data/raw/profiles/<slug>.md  — copies of the profiles from the RPL
 *         OPS Claude project. GITIGNORED, and deliberately so: they contain
 *         internal working notes that should not be in the repo.
 * Output: src/data/profiles.json       — public content only, committed.
 *
 * Run:  npm run profiles
 *
 * WHAT GETS STRIPPED, and why:
 *
 * - "## Open — meta-game / meta-analysis (Jacob to fill in)" — a TODO list of
 *   unanswered questions addressed to Jacob. Some of it is candid about draft
 *   decisions ("or just who was left/affordable"). Not public content.
 * - "## Season log" — a changelog of edits to the profile document itself,
 *   including corrections. Interesting to Jacob, meaningless to a reader.
 * - Inline references to other documents in the Claude project (`claude/...`),
 *   which point at files no site visitor can open.
 *
 * The script FAILS if any of those markers survive into the output, so a
 * reworded heading upstream can't quietly leak internal notes onto the site.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import season1 from "../src/data/season1.json" with { type: "json" };
import season2 from "../src/data/season2.json" with { type: "json" };

/** slug -> display name, so cross-references can be turned into real links. */
const NAMES = new Map(
  [...season1.players, ...season2.players].map((p) => [p.slug, p.name])
);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IN = resolve(ROOT, "data/raw/profiles");
const OUT = resolve(ROOT, "src/data/profiles.json");
const TEAMS_IN = resolve(ROOT, "data/raw/profiles/teams");
const TEAMS_OUT = resolve(ROOT, "src/data/team-profiles.json");

/** Headings whose entire section is internal-only. Matched case-insensitively. */
const INTERNAL_SECTIONS = [/^open\b/i, /^season log$/i];

/** Headings reworded for a public reader. */
const HEADING_REWRITES = new Map([
  ["Season 1 stats (RPL_Master_Tracker)", "Season 1 stats"],
]);

/** Nothing in the published output may match these. */
const LEAK_PATTERNS = [
  { pattern: /claude\//i, label: "internal document reference" },
  { pattern: /\bJacob\b/, label: "Jacob by name" },
  { pattern: /to fill in/i, label: "TODO marker" },
  { pattern: /\.md\b/, label: "leftover document filename" },
];

function stripInternalRefs(text) {
  return (
    text
      // 1. Cross-references to another player's profile become real links
      //    rather than dead filenames.
      .replace(/`(?:claude\/)?players\/([a-z0-9-]+)\.md`/g, (_m, slug) => {
        const name = NAMES.get(slug);
        return name ? `[${name}'s profile](/players/${slug})` : "";
      })
      // 2. Remove every remaining document reference BEFORE any
      //    sentence-level cleanup. Doing this first matters: a sentence like
      //    "See `a.md` for methodology and `b.md`." contains periods inside
      //    the filenames, so a sentence regex run first would stop at ".md"
      //    and leave "md`" stranded. Covers both project docs (`claude/...`)
      //    and memory files (`/areas/...`).
      .replace(/`(?:claude\/|\/areas\/)[^`]+`/g, "")
      // 3. Clean up what those removals left behind.
      .replace(/\s*\((?:\s*(?:full recap|see|source)\s*:)?\s*\)/gi, "")
      .replace(/\s*(?:See|see)\s+(?:for|and|,)[^.]*\./g, "")
      .replace(/\s+(?:and|,)\s*\./g, ".")
      .replace(/\s+([.,;])/g, "$1")
      // 4. Sourcing attributions. The fact is publishable; who confirmed it
      //    and when is internal provenance.
      .replace(/(?:Confirmed|Noted|Per)\s+\d{4}-\d{2}-\d{2}\s*\([^)]*\)\s*:\s*/g, "")
      .replace(/\s*\((?:per\s+)?Jacob(?:,\s*\d{4}-\d{2}-\d{2})?\)/gi, "")
      .replace(/\s*—?\s*(?:per|confirmed by)\s+Jacob\b[^.,;]*/gi, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Split a profile into its intro and its `##` sections. */
function parse(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let intro = [];
  let current = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) continue; // the player's name — the page already has it

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      if (current) sections.push(current);
      current = { heading: h2[1].trim(), body: [] };
      continue;
    }

    if (current) current.body.push(line);
    else intro.push(line);
  }
  if (current) sections.push(current);

  return { intro: intro.join("\n"), sections };
}

/** Read a directory of profile markdown, strip the internal parts, return JSON. */
function buildProfiles(dir, label) {
  if (!existsSync(dir)) {
    throw new Error(
      `No profile source at ${dir}. These are gitignored — copy them from the ` +
        `RPL OPS Claude project before running this.`
    );
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const profiles = {};
  let dropped = 0;

  for (const file of files) {
    const slug = basename(file, ".md");
    const raw = readFileSync(resolve(dir, file), "utf8");
    const { intro, sections } = parse(raw);

    const publicSections = sections.filter((s) => {
      const internal = INTERNAL_SECTIONS.some((re) => re.test(s.heading));
      if (internal) dropped += 1;
      return !internal;
    });

    profiles[slug] = {
      slug,
      intro: marked.parse(stripInternalRefs(intro)),
      sections: publicSections.map((s) => ({
        heading: HEADING_REWRITES.get(s.heading) ?? s.heading,
        html: marked.parse(stripInternalRefs(s.body.join("\n"))),
      })),
    };
  }

  // Fail loudly rather than shipping something internal.
  const failures = [];
  for (const [slug, profile] of Object.entries(profiles)) {
    const blob = [
      profile.intro,
      ...profile.sections.flatMap((s) => [s.heading, s.html]),
    ].join("\n");
    for (const { pattern, label: what } of LEAK_PATTERNS) {
      if (pattern.test(blob)) failures.push(`${label}/${slug}: ${what}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      "Internal content would have been published:\n  " +
        failures.join("\n  ") +
        "\nFix the stripping rules in scripts/build-profiles.mjs before rerunning."
    );
  }

  return { profiles, dropped };
}

function main() {
  const players = buildProfiles(IN, "players");
  writeFileSync(OUT, JSON.stringify(players.profiles, null, 2) + "\n");
  console.log(
    `profiles.json — ${Object.keys(players.profiles).length} players, ` +
      `${players.dropped} internal sections dropped`
  );

  const teams = buildProfiles(TEAMS_IN, "teams");
  writeFileSync(TEAMS_OUT, JSON.stringify(teams.profiles, null, 2) + "\n");
  console.log(
    `team-profiles.json — ${Object.keys(teams.profiles).length} teams, ` +
      `${teams.dropped} internal sections dropped`
  );
}

main();
