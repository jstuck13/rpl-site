import type { Metadata } from "next";
import { CURRENT_SEASON } from "@/lib/data";
import {
  DAYS_PLAYED,
  DAYS_TOTAL,
  FORMAT,
  MATCH_DAYS,
  remainingDays,
  seriesScore,
  type SeriesResult,
} from "@/lib/season";
import { teamName } from "@/lib/teams";

export const metadata: Metadata = { title: "Schedule & results" };

function SeriesCard({ series }: { series: SeriesResult }) {
  const winnerIsHome = series.winner === series.home;
  return (
    <article className="series">
      <div className="series__teams">
        <span
          className={`series__team${winnerIsHome ? " series__team--won" : ""}`}
        >
          {teamName(series.home)}
        </span>
        <span className="series__score">{seriesScore(series)}</span>
        <span
          className={`series__team${!winnerIsHome ? " series__team--won" : ""}`}
        >
          {teamName(series.away)}
        </span>
      </div>
      <ol className="series__games">
        {series.games.map((g) => (
          <li key={g.game}>
            <span className="series__games-label">G{g.game}</span>
            <span
              className={g.home > g.away ? "series__games-win" : undefined}
            >
              {g.home}
            </span>
            <span className="series__games-dash">–</span>
            <span
              className={g.away > g.home ? "series__games-win" : undefined}
            >
              {g.away}
            </span>
          </li>
        ))}
      </ol>
      {series.summary && <p className="series__summary">{series.summary}</p>}
    </article>
  );
}

export default function SchedulePage() {
  const upcoming = remainingDays();

  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">
          Season {CURRENT_SEASON} · {DAYS_PLAYED} of {DAYS_TOTAL} match days
          played
        </p>
        <div className="section__head">
          <h1 className="section__title">Schedule &amp; results</h1>
        </div>
        <p className="note">{FORMAT.note}</p>
      </section>

      {MATCH_DAYS.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Results</h2>
          </div>
          <div className="stack">
            {[...MATCH_DAYS].reverse().map((day) => (
              <div key={day.matchDay}>
                <div className="day-head">
                  <h3 className="day-head__title">
                    Match Day {day.matchDay}
                  </h3>
                  <span className="day-head__meta">
                    {day.bye.length > 0 && (
                      <>Bye: {day.bye.map(teamName).join(", ")}</>
                    )}
                  </span>
                </div>
                <div className="grid grid--series">
                  {day.series.map((s) => (
                    <SeriesCard key={`${s.home}-${s.away}`} series={s} />
                  ))}
                </div>
                {day.scheduleNote && (
                  <p className="note" style={{ marginTop: "16px" }}>
                    {day.scheduleNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section__head">
          <h2 className="section__title">Remaining fixtures</h2>
        </div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Series</th>
                <th>Bye</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((day) => (
                <tr key={day.day}>
                  <td className="rank-col">{day.day}</td>
                  <td>
                    {day.series
                      .map(([a, b]) => `${teamName(a)} v ${teamName(b)}`)
                      .join("  ·  ")}
                  </td>
                  <td style={{ color: "var(--rpl-text-faint)" }}>
                    {day.bye.map(teamName).join(", ")}
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
