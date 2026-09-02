import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CURRENT_SEASON,
  formatMoney,
  rosters,
  teamProfileBySlug,
} from "@/lib/data";
import {
  MATCH_DAYS,
  goalDiff,
  seriesScore,
  standings,
  winPct,
} from "@/lib/season";
import {
  teamAccent,
  teamBySlug,
  teamName,
  teamSlug,
  teamsForSeason,
} from "@/lib/teams";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return teamsForSeason(CURRENT_SEASON).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = teamBySlug(slug);
  return { title: team ? team.name : "Club" };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const team = teamBySlug(slug);
  if (!team) notFound();

  const squad = rosters().find((r) => r.code === team.code);
  const row = standings().find((s) => s.code === team.code);
  const profile = teamProfileBySlug(slug);

  // Every series this club has played, newest first.
  const played = [...MATCH_DAYS]
    .reverse()
    .flatMap((day) =>
      day.series
        .filter((s) => s.home === team.code || s.away === team.code)
        .map((s) => ({ day, series: s }))
    );

  const pct = row ? winPct(row) : null;

  return (
    <div className="shell stack">
      <div>
        <Link href="/teams" className="back-link">
          ← All clubs
        </Link>
      </div>

      <section
        className="player-head"
        style={{
          borderBottom: `1px solid var(--rpl-border)`,
          ["--team-accent" as string]: teamAccent(team.code),
        }}
      >
        <div>
          <h1 className="player-head__name">{team.name}</h1>
          <div className="player-head__meta">
            {squad?.manager && (
              <Link
                href={`/players/${squad.manager.slug}`}
                className="tag tag--manager"
              >
                {squad.manager.name}
              </Link>
            )}
            {row?.played ? (
              <span className="tag">
                {row.wins}–{row.losses}
                {pct !== null && ` · ${(pct * 100).toFixed(1)}%`}
              </span>
            ) : (
              <span className="tag tag--inactive">No games played</span>
            )}
          </div>
        </div>
        <div className="player-head__value">
          <p className="stat__label">Squad value</p>
          <div className="stat__value stat__value--gold">
            {formatMoney(squad?.totalValue ?? null)}
          </div>
        </div>
      </section>

      {row?.played && (
        <section>
          <div className="grid grid--stats">
            <div className="stat">
              <p className="stat__label">Games won</p>
              <div className="stat__value">{row.wins}</div>
            </div>
            <div className="stat">
              <p className="stat__label">Games lost</p>
              <div className="stat__value">{row.losses}</div>
            </div>
            <div className="stat">
              <p className="stat__label">Series</p>
              <div className="stat__value">
                {row.seriesWon}–{row.seriesLost}
              </div>
            </div>
            <div className="stat">
              <p className="stat__label">Goals for</p>
              <div className="stat__value">{row.goalsFor}</div>
            </div>
            <div className="stat">
              <p className="stat__label">Goals against</p>
              <div className="stat__value">{row.goalsAgainst}</div>
            </div>
            <div className="stat">
              <p className="stat__label">Difference</p>
              <div className="stat__value stat__value--gold">
                {goalDiff(row) > 0 ? `+${goalDiff(row)}` : goalDiff(row)}
              </div>
            </div>
          </div>
        </section>
      )}

      {profile && (
        <section className="profile">
          {profile.sections.map((section) => (
            <div key={section.heading} className="profile__section">
              <h2 className="profile__heading">{section.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: section.html }} />
            </div>
          ))}
        </section>
      )}

      {squad && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Roster</h2>
          </div>
          <div className="panel table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Rank</th>
                  <th className="num">GP</th>
                  <th className="num">G</th>
                  <th className="num">A</th>
                  <th className="num">S</th>
                  <th className="num">Value</th>
                </tr>
              </thead>
              <tbody>
                {squad.players.map((p) => (
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
                    <td>{p.rank ?? "—"}</td>
                    <td className="num">{p.totals.games ?? "—"}</td>
                    <td className="num">{p.totals.goals ?? "—"}</td>
                    <td className="num">{p.totals.assists ?? "—"}</td>
                    <td className="num">{p.totals.saves ?? "—"}</td>
                    <td className="value">
                      {formatMoney(p.valuation.playerValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {played.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">Results</h2>
            <Link href="/schedule" className="section__link">
              Full schedule →
            </Link>
          </div>
          <div className="grid grid--series">
            {played.map(({ day, series }) => {
              const opponent =
                series.home === team.code ? series.away : series.home;
              const won = series.winner === team.code;
              // seriesScore() always reads winner-first; this card always leads
              // with THIS club, so flip it when they lost.
              const score = won
                ? seriesScore(series)
                : seriesScore(series).split("–").reverse().join("–");
              return (
                <article
                  key={`${day.matchDay}-${series.home}-${series.away}`}
                  className="series"
                >
                  <div className="series__teams">
                    <span className="series__team series__team--won">
                      {team.name}
                    </span>
                    <span className="series__score">
                      {score}
                    </span>
                    <Link
                      href={`/teams/${teamSlug(opponent) ?? ""}`}
                      className="series__team"
                    >
                      {teamName(opponent)}
                    </Link>
                  </div>
                  <ol className="series__games">
                    <li>
                      <span className="series__games-label">
                        MD{day.matchDay}
                      </span>
                      <span className={won ? "series__games-win" : undefined}>
                        {won ? "Won" : "Lost"}
                      </span>
                    </li>
                  </ol>
                  {series.summary && (
                    <p className="series__summary">{series.summary}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
