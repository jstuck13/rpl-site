import type { Metadata } from "next";
import Link from "next/link";
import { TeamChip } from "@/ds/components/TeamChip";
import { CURRENT_SEASON } from "@/lib/data";
import { RECAPS, formatDate } from "@/lib/recaps";
import { teamName } from "@/lib/teams";

export const metadata: Metadata = { title: "Recaps" };

export default function RecapsPage() {
  return (
    <div className="shell stack">
      <section>
        <p className="eyebrow">Season {CURRENT_SEASON}</p>
        <div className="section__head">
          <h1 className="section__title">Match day recaps</h1>
        </div>

        {RECAPS.length === 0 ? (
          <p className="note">
            No match days have been written up yet. They&apos;ll appear here as
            the season is played.
          </p>
        ) : (
          <div className="stack">
            {RECAPS.map((recap) => (
              <article key={recap.matchDay} className="recap-card">
                <div className="day-head">
                  <h2 className="day-head__title">
                    <Link href={`/recaps/${recap.matchDay}`}>
                      Match Day {recap.matchDay}
                    </Link>
                  </h2>
                  <span className="day-head__meta">
                    {formatDate(recap.date)}
                  </span>
                </div>
                <h3 className="recap-card__title">
                  <Link href={`/recaps/${recap.matchDay}`}>{recap.title}</Link>
                </h3>
                {recap.subtitle && (
                  <p className="recap-card__subtitle">{recap.subtitle}</p>
                )}
                <p className="recap-card__headline">{recap.headline}</p>
                <div className="recap-card__clubs">
                  {recap.teamsPlayed.map((code) => (
                    <TeamChip key={code} team={teamName(code)} size="sm" />
                  ))}
                  {recap.teamsOnBye.length > 0 && (
                    <span className="day-head__meta">
                      Bye: {recap.teamsOnBye.map(teamName).join(", ")}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
