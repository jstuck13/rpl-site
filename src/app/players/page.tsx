import type { Metadata } from "next";
import Link from "next/link";
import { TeamChip } from "@/ds/components/TeamChip";
import { CURRENT_SEASON, formatMoney, getSeason } from "@/lib/data";
import { teamName } from "@/lib/teams";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  const players = [...getSeason().players].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );

  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">Season {CURRENT_SEASON}</p>
        <div className="section__head">
          <h1 className="section__title">Players</h1>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Rank</th>
                <th>Status</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.slug}>
                  <td>
                    <div className="player-cell">
                      <Link
                        href={`/players/${p.slug}`}
                        className="player-cell__name"
                      >
                        {p.name}
                      </Link>
                      {p.isManager && (
                        <span className="tag tag--manager">Manager</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {p.team ? (
                      <TeamChip team={teamName(p.team)} size="sm" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{p.rank ?? "—"}</td>
                  <td>{p.status ?? "—"}</td>
                  <td className="value">
                    {formatMoney(p.valuation.playerValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
