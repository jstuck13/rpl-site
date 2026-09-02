import Link from "next/link";
import {
  CURRENT_SEASON,
  formatMoney,
  leaderboard,
  rosters,
} from "@/lib/data";
import { DAYS_PLAYED, DAYS_TOTAL, goalDiff, standings } from "@/lib/season";
import { PlayerTable } from "@/components/PlayerRow";

export default function HomePage() {
  const board = leaderboard();
  const top = board.slice(0, 8);
  const squads = rosters();
  const table = standings();
  const totalValue = board.reduce(
    (sum, p) => sum + (p.valuation.playerValue ?? 0),
    0
  );

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">Season {CURRENT_SEASON}</p>
        <h1 className="hero__title">
          Rocket <em>Premier League</em>
        </h1>
        <p className="hero__lede">
          Six clubs, {board.length} rostered players, one auction-drafted salary
          cap. {DAYS_PLAYED} of {DAYS_TOTAL} match days played — Player Value
          recalculates from every logged match.
        </p>
      </section>

      <section>
        <div className="grid grid--stats">
          <div className="stat">
            <p className="stat__label">Teams</p>
            <div className="stat__value">{squads.length}</div>
          </div>
          <div className="stat">
            <p className="stat__label">Players</p>
            <div className="stat__value">{board.length}</div>
          </div>
          <div className="stat">
            <p className="stat__label">League value</p>
            <div className="stat__value stat__value--gold">
              {formatMoney(totalValue)}
            </div>
          </div>
          <div className="stat">
            <p className="stat__label">Top value</p>
            <div className="stat__value stat__value--gold">
              {formatMoney(top[0]?.valuation.playerValue ?? null)}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Standings</h2>
          <Link href="/standings" className="section__link">
            Full table →
          </Link>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Club</th>
                <th className="num">W</th>
                <th className="num">L</th>
                <th className="num">GF</th>
                <th className="num">GA</th>
                <th className="num">Diff</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => {
                const diff = goalDiff(row);
                return (
                  <tr key={row.code}>
                    <td className="rank-col">{row.played ? i + 1 : "—"}</td>
                    <td className="player-cell__name">{row.name}</td>
                    <td className="num">{row.played ? row.wins : "—"}</td>
                    <td className="num">{row.played ? row.losses : "—"}</td>
                    <td className="num">{row.played ? row.goalsFor : "—"}</td>
                    <td className="num">
                      {row.played ? row.goalsAgainst : "—"}
                    </td>
                    <td className="num">
                      {row.played ? (diff > 0 ? `+${diff}` : diff) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Player Value — top 8</h2>
          <Link href="/leaderboard" className="section__link">
            Full leaderboard →
          </Link>
        </div>
        <PlayerTable players={top} />
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Clubs</h2>
          <Link href="/teams" className="section__link">
            All teams →
          </Link>
        </div>
        <div className="grid grid--teams">
          {squads.map((team) => (
            <article key={team.code} className="team-card">
              <h3 className="team-card__name">{team.name}</h3>
              <p className="team-card__meta">
                {team.manager ? `${team.manager.name} · ` : ""}
                {formatMoney(team.totalValue)} squad value
              </p>
              <ul className="team-card__roster">
                {team.players.map((p) => (
                  <li key={p.slug} className="team-card__row">
                    <Link href={`/players/${p.slug}`}>{p.name}</Link>
                    <span>{formatMoney(p.valuation.playerValue)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
