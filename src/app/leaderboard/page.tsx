import type { Metadata } from "next";
import { CURRENT_SEASON, alumni, leaderboard } from "@/lib/data";
import { PlayerTable } from "@/components/PlayerRow";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  const board = leaderboard();
  const sidelined = alumni().filter((p) => p.status === "Inactive");

  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">Season {CURRENT_SEASON}</p>
        <div className="section__head">
          <h1 className="section__title">Player Value leaderboard</h1>
        </div>
        <PlayerTable players={board} />
      </section>

      <section>
        <p className="note">
          <strong>How this is calculated.</strong> Base Value scales a player&apos;s
          average points between the league minimum, average and maximum. A
          modifier compares their goals, assists, saves, shots and points against
          other active players at the same in-game rank, then nudges the value up
          or down. Returning players blend that season value with their prior
          value, weighted by games played.
        </p>
      </section>

      {sidelined.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Not rostered this season</h2>
          </div>
          <div className="panel table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Last rank</th>
                  <th className="num">Prior value</th>
                </tr>
              </thead>
              <tbody>
                {sidelined.map((p) => (
                  <tr key={p.slug}>
                    <td>
                      <div className="player-cell">
                        <span className="player-cell__name">{p.name}</span>
                        <span className="tag tag--inactive">Inactive</span>
                      </div>
                    </td>
                    <td>{p.rank ?? "—"}</td>
                    <td className="value">
                      {p.priorValue === null
                        ? "—"
                        : `$${p.priorValue.toLocaleString("en-US")}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
