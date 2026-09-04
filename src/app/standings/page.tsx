import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_SEASON } from "@/lib/data";
import {
  DAYS_PLAYED,
  DAYS_TOTAL,
  goalDiff,
  standings,
  winPct,
} from "@/lib/season";
import { teamAccent } from "@/lib/teams";

export const metadata: Metadata = { title: "Standings" };

export default function StandingsPage() {
  const table = standings();

  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">
          Season {CURRENT_SEASON} · {DAYS_PLAYED} of {DAYS_TOTAL} match days
          played
        </p>
        <div className="section__head">
          <h1 className="section__title">Standings</h1>
          <Link href="/schedule" className="section__link">
            Schedule &amp; results →
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
                <th className="num">Win %</th>
                <th className="num">GF</th>
                <th className="num">GA</th>
                <th className="num">Diff</th>
                <th className="num">Series</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => {
                const pct = winPct(row);
                const diff = goalDiff(row);
                return (
                  <tr key={row.code}>
                    <td className="rank-col">{row.played ? i + 1 : "—"}</td>
                    <td className="player-cell__name">
                      <span
                        className="team-dot"
                        style={{ background: teamAccent(row.code) }}
                      />
                      {row.name}
                    </td>
                    <td className="num">{row.played ? row.wins : "—"}</td>
                    <td className="num">{row.played ? row.losses : "—"}</td>
                    <td className="num">
                      {pct === null ? "—" : `${(pct * 100).toFixed(1)}%`}
                    </td>
                    <td className="num">{row.played ? row.goalsFor : "—"}</td>
                    <td className="num">
                      {row.played ? row.goalsAgainst : "—"}
                    </td>
                    <td
                      className="num"
                      style={{
                        color: !row.played
                          ? undefined
                          : diff > 0
                            ? "var(--rpl-good)"
                            : diff < 0
                              ? "var(--rpl-danger)"
                              : undefined,
                      }}
                    >
                      {row.played ? (diff > 0 ? `+${diff}` : diff) : "—"}
                    </td>
                    <td className="num">
                      {row.played
                        ? `${row.seriesWon}–${row.seriesLost}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className="note">
          <strong>Ranked by games won, not series won.</strong> Every series is a
          best-of-three and each individual game counts, so a 2–1 series win
          still hands the loser a game. Clubs that haven&apos;t played yet sit at
          the bottom rather than at the top on a 0–0. Goal difference is the
          display tiebreaker here — RPL hasn&apos;t settled a formal one, so
          treat that as ordering, not a ruling.
        </p>
      </section>
    </div>
  );
}
