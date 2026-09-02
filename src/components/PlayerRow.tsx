import Link from "next/link";
import { TeamChip } from "@/ds/components/TeamChip";
import { formatMoney, type Player } from "@/lib/data";
import { teamName } from "@/lib/teams";

/** One row of the Player Value leaderboard. */
export function PlayerRow({ player, rank }: { player: Player; rank: number }) {
  return (
    <tr>
      <td className="rank-col">{rank}</td>
      <td>
        <div className="player-cell">
          <Link href={`/players/${player.slug}`} className="player-cell__name">
            {player.name}
          </Link>
          {player.isManager && <span className="tag tag--manager">Manager</span>}
          {player.status === "Exempt" && (
            <span className="tag tag--exempt">Exempt</span>
          )}
        </div>
      </td>
      <td>
        <TeamChip team={teamName(player.team)} size="sm" />
      </td>
      <td>{player.rank ?? "—"}</td>
      <td className="num">{player.totals.games ?? "—"}</td>
      <td className="num">{player.totals.goals ?? "—"}</td>
      <td className="num">{player.totals.assists ?? "—"}</td>
      <td className="num">{player.totals.saves ?? "—"}</td>
      <td className="value">{formatMoney(player.valuation.playerValue)}</td>
    </tr>
  );
}

export function PlayerTable({ players }: { players: Player[] }) {
  return (
    <div className="panel table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Team</th>
            <th>Rank</th>
            <th className="num">GP</th>
            <th className="num">G</th>
            <th className="num">A</th>
            <th className="num">S</th>
            <th className="num">Value</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => (
            <PlayerRow key={player.slug} player={player} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
