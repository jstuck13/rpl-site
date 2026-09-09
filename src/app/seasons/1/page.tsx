import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, formatNum } from "@/lib/data";
import {
  archiveAwards,
  archiveBoard,
  archiveClubs,
  archiveVoided,
  type AwardWinner,
} from "@/lib/archive";
import { teamAccent } from "@/lib/teams";

const SEASON = 1;

/**
 * The Season 1 record. Static rather than a [season] route on purpose: there
 * is exactly one completed season, and the champion and the TTT note below
 * are facts about this one, not something derivable for any season. When
 * Season 2 closes, this becomes a /seasons index plus a shared template.
 */
export const metadata: Metadata = {
  title: "Season 1",
  description:
    "The Season 1 record — champion, award winners and the final value board.",
};

function awardValue(award: AwardWinner): string {
  if (award.value === null) return "—";
  if (award.format === "count") return String(award.value);
  if (award.format === "average") return formatNum(award.value, 2);
  return formatMoney(award.value);
}

export default function Season1Page() {
  const clubs = archiveClubs(SEASON);
  const awards = archiveAwards(SEASON);
  const board = archiveBoard(SEASON);
  const voided = archiveVoided(SEASON);

  const champion = clubs.find((c) => c.code === "LS");

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">The record</p>
        <h1 className="hero__title recap__title">Season 1</h1>
        <p className="hero__lede">
          Five clubs, a snake draft, and the first run of the Player Value
          model. This is what it finished as.
        </p>
      </section>

      {champion && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Champion</h2>
          </div>
          <div className="panel stat">
            <p className="stat__label">Winner</p>
            <p className="stat__value">{champion.name}</p>
            <p className="stat__sub">
              {champion.players.map((p) => p.name).join(" · ")} — closing squad
              value {formatMoney(champion.squadValue)}
            </p>
          </div>
          <p className="note">
            That closing value is why Season 2&apos;s salary cap is the number
            it is: the cap was set at 110% of the champion&apos;s final roster
            value, so the league&apos;s budget is anchored to how the previous
            season actually finished rather than picked by hand. The details
            are on the <Link href="/rules">rules page</Link>.
          </p>
        </section>
      )}

      <section>
        <div className="section__head">
          <h2 className="section__title">Award winners</h2>
        </div>
        <div className="grid grid--stats">
          {awards.map((award) => (
            <div className="stat" key={award.label}>
              <p className="stat__label">{award.label}</p>
              <p className="stat__value">
                {award.player ? award.player.name : "—"}
              </p>
              <p className="stat__sub">
                {award.basis} — {awardValue(award)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Clubs</h2>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Club</th>
                <th>Roster</th>
                <th className="num">Closing squad value</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.code}>
                  <td>
                    <span
                      className="team-dot"
                      style={{ background: teamAccent(club.code) }}
                    />
                    {club.name}
                    {!club.active && (
                      <span className="tag tag--inactive">Withdrawn</span>
                    )}
                  </td>
                  <td>{club.players.map((p) => p.name).join(", ")}</td>
                  <td className="num value">
                    {club.squadValue === null
                      ? "N/A"
                      : formatMoney(club.squadValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Final value board</h2>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Club</th>
                <th className="num">Games</th>
                <th className="num">Goals</th>
                <th className="num">Assists</th>
                <th className="num">Avg points</th>
                <th className="num">Closing value</th>
              </tr>
            </thead>
            <tbody>
              {board.map((p, i) => (
                <tr key={p.slug}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <Link href={`/players/${p.slug}`} className="player-cell__name">
                      {p.name}
                    </Link>
                  </td>
                  <td>
                    <span
                      className="team-dot"
                      style={{ background: teamAccent(p.team) }}
                    />
                    {p.team ?? "—"}
                  </td>
                  <td className="num">{p.totals.games ?? "—"}</td>
                  <td className="num">{p.totals.goals ?? "—"}</td>
                  <td className="num">{p.totals.assists ?? "—"}</td>
                  <td className="num">{formatNum(p.averages.points, 2)}</td>
                  <td className="num value">
                    {formatMoney(p.valuation.playerValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {voided.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Withdrawn mid-season</h2>
          </div>
          <p className="note">
            TTT left the season partway through, and the schedule was rebalanced
            around the four remaining clubs. Their players&apos; values were
            voided rather than carried forward — an incomplete season
            can&apos;t be priced against full ones — but the games they did
            play are still on the record, and still count toward their career
            history.
          </p>
          <div className="panel table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th className="num">Games</th>
                  <th className="num">Goals</th>
                  <th className="num">Assists</th>
                  <th className="num">Avg points</th>
                  <th className="num">Closing value</th>
                </tr>
              </thead>
              <tbody>
                {voided.map((p) => (
                  <tr key={p.slug}>
                    <td>
                      <Link
                        href={`/players/${p.slug}`}
                        className="player-cell__name"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="num">{p.totals.games ?? "—"}</td>
                    <td className="num">{p.totals.goals ?? "—"}</td>
                    <td className="num">{p.totals.assists ?? "—"}</td>
                    <td className="num">{formatNum(p.averages.points, 2)}</td>
                    <td className="num">N/A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <p className="note">
          <strong>What isn&apos;t here.</strong> Season 1 finished before this
          site existed, so there are no per-series scorelines or match-day
          recaps for it — the tracker recorded cumulative stats, not
          individual results. Rather than reconstruct a table from memory,
          this page shows only what was actually recorded at the time.
        </p>
        <Link href="/players" className="section__link">
          Every player&apos;s full history →
        </Link>
      </section>
    </div>
  );
}
