import type { Metadata } from "next";
import Link from "next/link";
import { TeamChip } from "@/ds/components/TeamChip";
import {
  CURRENT_SEASON,
  allSeasons,
  formatMoney,
  playersByStatus,
} from "@/lib/data";
import { teamName } from "@/lib/teams";
import { SeasonTabs } from "./SeasonTabs";

export const metadata: Metadata = { title: "Players" };

function PlayerTable({ season }: { season: number }) {
  const players = playersByStatus(season);

  return (
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
                  <Link href={`/players/${p.slug}`} className="player-cell__name">
                    {p.name}
                  </Link>
                  {p.isManager && (
                    <span className="tag tag--manager">Manager</span>
                  )}
                </div>
              </td>
              <td>
                {p.team ? <TeamChip team={teamName(p.team)} size="sm" /> : "—"}
              </td>
              <td>{p.rank ?? "—"}</td>
              <td>{p.status ?? "—"}</td>
              <td className="value">{formatMoney(p.valuation.playerValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlayersPage() {
  const tabs = allSeasons().map(({ season }) => ({
    season,
    content: <PlayerTable season={season} />,
  }));

  return (
    <div className="shell stack">
      <section>
        <div className="section__head">
          <h1 className="section__title">Players</h1>
        </div>
        <SeasonTabs tabs={tabs} initial={CURRENT_SEASON} />
      </section>
    </div>
  );
}
