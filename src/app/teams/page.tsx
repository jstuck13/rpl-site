import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_SEASON, formatMoney, rosters } from "@/lib/data";
import { teamAccent, teamSlug } from "@/lib/teams";

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage() {
  const squads = rosters();

  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">Season {CURRENT_SEASON}</p>
        <div className="section__head">
          <h1 className="section__title">Clubs</h1>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Club</th>
                <th>Manager</th>
                <th className="num">Players</th>
                <th className="num">Squad value</th>
              </tr>
            </thead>
            <tbody>
              {squads.map((team, i) => (
                <tr key={team.code}>
                  <td className="rank-col">{i + 1}</td>
                  <td>
                    <Link
                      href={`/teams/${teamSlug(team.code)}`}
                      className="player-cell__name"
                    >
                      {team.name}
                    </Link>
                  </td>
                  <td>
                    {team.manager ? (
                      <Link href={`/players/${team.manager.slug}`}>
                        {team.manager.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">{team.players.length}</td>
                  <td className="value">{formatMoney(team.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="grid grid--teams">
          {squads.map((team) => (
            <article
              key={team.code}
              className="team-card"
              style={{ ["--team-accent" as string]: teamAccent(team.code) }}
            >
              <h2 className="team-card__name">
                <Link href={`/teams/${teamSlug(team.code)}`}>{team.name}</Link>
              </h2>
              <p className="team-card__meta">
                {formatMoney(team.totalValue)} squad value
              </p>
              <ul className="team-card__roster">
                {team.players.map((p) => (
                  <li key={p.slug} className="team-card__row">
                    <Link href={`/players/${p.slug}`}>
                      {p.name}
                      {p.isManager ? " ·" : ""}
                    </Link>
                    <span>{formatMoney(p.valuation.playerValue)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="note" style={{ marginTop: "16px" }}>
          <strong>No team colors yet.</strong> Every club currently uses brand
          gold. The design system marks its orange and blue as in-game side
          colors, not brand colors, so team accents are waiting on a real
          palette.
        </p>
      </section>
    </div>
  );
}
