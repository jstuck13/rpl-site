import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { marked } from "marked";
import { CURRENT_SEASON } from "@/lib/data";
import { DAYS_PLAYED, DAYS_TOTAL } from "@/lib/season";
import { standingsMovement, teamStreaks } from "@/lib/currently";
import { awards, awardGaps } from "@/lib/awards";
import { formatDate, latestRecap } from "@/lib/recaps";
import { formatTime, nextUp } from "@/lib/next-up";
import { teamAccent, teamName } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Currently",
  description:
    "What's actually happening in RPL right now — standings movement, award races, and streaks.",
};

const NOTE_SOURCE = join(process.cwd(), "src/content/currently.md");

/**
 * The one hand-written piece of this page — everything else below is
 * computed straight from results.json. See currently.md for the format;
 * an empty `note` (the default) means this returns null and the block
 * doesn't render at all.
 */
function readNote(): string | null {
  let raw: string;
  try {
    raw = readFileSync(NOTE_SOURCE, "utf8");
  } catch {
    return null;
  }
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;

  for (const line of match[1].split("\n")) {
    const kv = line.match(/^note:\s*(.*)$/);
    if (!kv) continue;
    const trimmed = kv[1].trim();
    const value = /^["']/.test(trimmed)
      ? trimmed.replace(/^(["'])(.*?)\1.*$/, "$2")
      : trimmed;
    return value.length > 0 ? value : null;
  }
  return null;
}

export default function CurrentlyPage() {
  const recap = latestRecap();
  const next = nextUp();
  const note = readNote();
  const movement = standingsMovement();
  const races = awards();
  const gaps = new Map(awardGaps().map((g) => [g.key, g]));
  const streaks = teamStreaks();

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">Rocket Premier League</p>
        <h1 className="hero__title recap__title">Currently</h1>
        <p className="hero__lede">
          What&apos;s actually happening right now — not the full tables,
          just what&apos;s moved.
        </p>

        <div className="hero-links">
          <span className="tag">
            Season {CURRENT_SEASON} · Match Day {DAYS_PLAYED} of {DAYS_TOTAL}
          </span>
          {recap && (
            <Link href={`/recaps/${recap.matchDay}`} className="section__link">
              Latest: {recap.headline} →
            </Link>
          )}
          {next && (
            <span className="hero-block__meta">
              Next: {next.series.map((s) => s.clubs.map(teamName).join(" v ")).join(", ")}
              {next.date
                ? ` · ${[formatDate(next.date), formatTime(next)].filter(Boolean).join(" · ")}`
                : ""}
            </span>
          )}
        </div>
      </section>

      {note && (
        <section>
          <p className="stat__label">The gist</p>
          <p className="note" dangerouslySetInnerHTML={{ __html: marked.parseInline(note) as string }} />
        </section>
      )}

      {movement.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Standings movement</h2>
            <Link href="/standings" className="section__link">
              Full table →
            </Link>
          </div>
          <p className="note" style={{ marginBottom: "var(--rpl-space-3)" }}>
            Since the last match day.
          </p>
          <ul className="currently-list">
            {movement.map((m) => (
              <li key={m.code} className="currently-list__item">
                <span
                  className="team-dot"
                  style={{ background: teamAccent(m.code) }}
                />
                <span className="currently-list__name">{m.name}</span>
                <span
                  className={`currently-list__delta currently-list__delta--${
                    m.delta > 0 ? "up" : "down"
                  }`}
                >
                  {m.delta > 0 ? "↑" : "↓"} {m.previousRank} → {m.currentRank}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {races.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Award races</h2>
          </div>
          <div className="grid grid--races">
            {races.map((award) => {
              const gap = gaps.get(award.key);
              const leaders = award.holders.map((h) => h.name).join(", ");
              return (
                <article key={award.key} className="hero-block">
                  <p className="stat__label">{award.name}</p>
                  <p className="hero-block__headline">
                    {leaders} — {award.value}
                  </p>
                  {gap?.tied && (
                    <p className="hero-block__meta">
                      {award.holders.length}-way tie for the lead.
                    </p>
                  )}
                  {gap && !gap.tied && gap.gap && (
                    <p className="hero-block__meta">
                      {gap.gap} clear of {gap.chasing.map((h) => h.name).join(", ")}
                      {gap.chasingValue ? ` (${gap.chasingValue})` : ""}.
                    </p>
                  )}
                  {gap && !gap.tied && !gap.gap && (
                    <p className="hero-block__meta">
                      Nobody else on the board yet.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {streaks.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Streaks</h2>
          </div>
          <div className="streak-row">
            {streaks.map((s) => (
              <span
                key={s.code}
                className={`streak-badge streak-badge--${s.result === "W" ? "w" : "l"}`}
              >
                <span
                  className="team-dot"
                  style={{ background: teamAccent(s.code), marginRight: 0 }}
                />
                {s.name} · {s.result}
                {s.length}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="note">
          This page updates itself from logged results — nothing here is
          hand-maintained except the occasional line at the top. Full
          detail lives on <Link href="/standings">Standings</Link>,{" "}
          <Link href="/leaderboard">Leaderboard</Link>, and{" "}
          <Link href="/recaps">Recaps</Link>.
        </p>
      </section>
    </div>
  );
}
