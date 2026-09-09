import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_SEASON, formatMoney } from "@/lib/data";
import { DAYS_PLAYED, DAYS_TOTAL } from "@/lib/season";
import {
  CAP_BASIS,
  SALARY_CAP,
  clubSpend,
  draftBoard,
  draftHeadlines,
} from "@/lib/draft";
import { teamAccent } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Draft report card",
  description:
    "What each club paid at the Season 2 auction, and what those players are worth now.",
};

function signed(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "$0";
  const sign = value > 0 ? "+" : "−";
  return `${sign}$${Math.abs(value).toLocaleString("en-US")}`;
}

function deltaClass(value: number | null): string {
  if (value === null || value === 0) return "delta";
  return value > 0 ? "delta delta--up" : "delta delta--down";
}

export default function DraftPage() {
  const rows = draftBoard();
  const clubs = clubSpend();
  const head = draftHeadlines();

  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">
          Season {CURRENT_SEASON} · {DAYS_PLAYED} of {DAYS_TOTAL} match days
          played
        </p>
        <div className="section__head">
          <h1 className="section__title">Draft report card</h1>
        </div>
        <p className="page-lede">
          Every club had {formatMoney(SALARY_CAP)} to build a three-man roster at
          the auction. This is what they spent it on — and what those players are
          worth now.
        </p>
      </section>

      <section>
        <div className="grid grid--stats">
          <div className="stat">
            <p className="stat__label">Biggest riser</p>
            <p className="stat__value">
              {head.biggestRiser ? signed(head.biggestRiser.sinceDraft) : "—"}
            </p>
            <p className="stat__sub">
              {head.biggestRiser
                ? `${head.biggestRiser.player.name} — now ${formatMoney(
                    head.biggestRiser.player.valuation.playerValue
                  )}`
                : "No games played yet"}
            </p>
          </div>
          <div className="stat">
            <p className="stat__label">Biggest faller</p>
            <p className="stat__value">
              {head.biggestFaller ? signed(head.biggestFaller.sinceDraft) : "—"}
            </p>
            <p className="stat__sub">
              {head.biggestFaller
                ? `${head.biggestFaller.player.name} — now ${formatMoney(
                    head.biggestFaller.player.valuation.playerValue
                  )}`
                : "No games played yet"}
            </p>
          </div>
          <div className="stat">
            <p className="stat__label">Biggest premium paid</p>
            <p className="stat__value">
              {head.biggestPremium ? signed(head.biggestPremium.premium) : "—"}
            </p>
            <p className="stat__sub">
              {head.biggestPremium
                ? `${head.biggestPremium.player.name} — over his pre-draft value`
                : "—"}
            </p>
          </div>
          <div className="stat">
            <p className="stat__label">Biggest bargain</p>
            <p className="stat__value">
              {head.biggestBargain ? signed(head.biggestBargain.premium) : "—"}
            </p>
            <p className="stat__sub">
              {head.biggestBargain
                ? `${head.biggestBargain.player.name} — under his pre-draft value`
                : "—"}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Every pick</h2>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Club</th>
                <th className="num">Value at draft</th>
                <th className="num">Paid</th>
                <th className="num">Premium</th>
                <th className="num">Value now</th>
                <th className="num">Since draft</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pick.slug}>
                  <td>
                    <div className="player-cell">
                      <Link
                        href={`/players/${row.pick.slug}`}
                        className="player-cell__name"
                      >
                        {row.player.name}
                      </Link>
                      {row.pick.captain && (
                        <span className="tag tag--manager">Captain</span>
                      )}
                      {row.pinned && <span className="tag tag--exempt">Pinned</span>}
                      {!row.played && (
                        <span className="tag tag--inactive">Not played</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className="team-dot"
                      style={{ background: teamAccent(row.pick.team) }}
                    />
                    {row.teamName}
                  </td>
                  <td className="num">{formatMoney(row.player.priorValue)}</td>
                  <td className="num value">{formatMoney(row.pick.paid)}</td>
                  <td className={`num ${deltaClass(row.premium)}`}>
                    {row.pick.captain ? "—" : signed(row.premium)}
                  </td>
                  <td className="num">
                    {formatMoney(row.player.valuation.playerValue)}
                  </td>
                  <td className={`num ${deltaClass(row.sinceDraft)}`}>
                    {row.played ? signed(row.sinceDraft) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">By club</h2>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Club</th>
                <th className="num">Spent</th>
                <th className="num">Cap left</th>
                <th className="num">Premium</th>
                <th className="num">Squad at draft</th>
                <th className="num">Squad now</th>
                <th className="num">Since draft</th>
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
                    {!club.played && (
                      <span className="tag tag--inactive">Not played</span>
                    )}
                  </td>
                  <td className="num value">{formatMoney(club.spent)}</td>
                  <td className="num">{formatMoney(club.capLeft)}</td>
                  <td className={`num ${deltaClass(club.premium)}`}>
                    {signed(club.premium)}
                  </td>
                  <td className="num">{formatMoney(club.valueAtDraft)}</td>
                  <td className="num">{formatMoney(club.valueNow)}</td>
                  <td className={`num ${deltaClass(club.change)}`}>
                    {signed(club.change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className="note">
          <strong>How to read this.</strong> The two numbers are deliberately
          independent. <em>Premium</em> is what a club paid over or under a
          player&apos;s value at the auction — a fact about the bidding, fixed
          the moment the draft ended, and nothing to do with how he has played.{" "}
          <em>Since draft</em> is how that player&apos;s own value has moved
          since, and takes no account of what he cost: a player someone
          overpaid for and who then played well shows as a riser, because he is
          one. Captains were auto-drafted onto their own club at their own value
          rather than bid for, so they have no premium.
          LLellum&apos;s value is set by hand rather than by the model, so no
          movement is shown for him. The cap was {formatMoney(SALARY_CAP)} —{" "}
          {CAP_BASIS.toLowerCase()}
        </p>
        <p className="note">
          <strong>Zeroes that mean &ldquo;no data&rdquo;.</strong> A player or
          club who hasn&apos;t played shows exactly $0 of movement, because
          nothing has revalued them yet — that isn&apos;t the same as holding
          steady. Those rows are tagged. Lawson State and 999 were on the Day 1
          bye, so both clubs are still entirely at their auction-night values.
        </p>
        <p className="note">
          {head.playedCount} of {head.totalCount} drafted players have logged a
          game so far, so most of this is still the draft itself rather than a
          verdict on it. It moves every match day — see the{" "}
          <Link href="/leaderboard">leaderboard</Link> for current values.
        </p>
      </section>
    </div>
  );
}
