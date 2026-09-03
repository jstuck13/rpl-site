import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamChip } from "@/ds/components/TeamChip";
import { RECAPS, formatDate, recapByMatchDay } from "@/lib/recaps";
import { teamAccent, teamName, teamSlug } from "@/lib/teams";

type Params = { matchDay: string };

export function generateStaticParams(): Params[] {
  return RECAPS.map((r) => ({ matchDay: String(r.matchDay) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { matchDay } = await params;
  const recap = recapByMatchDay(Number(matchDay));
  return {
    title: recap ? `Match Day ${recap.matchDay}` : "Recap",
    description: recap?.headline,
  };
}

export default async function RecapPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { matchDay } = await params;
  const recap = recapByMatchDay(Number(matchDay));
  if (!recap) notFound();

  return (
    <div className="shell stack">
      <div>
        <Link href="/recaps" className="back-link">
          ← All recaps
        </Link>
      </div>

      <section>
        <p className="eyebrow">
          Match Day {recap.matchDay} · {formatDate(recap.date)}
        </p>
        <h1 className="hero__title recap__title">{recap.title}</h1>
        {recap.subtitle && <p className="hero__lede">{recap.subtitle}</p>}
        <div className="recap-card__clubs">
          {recap.teamsPlayed.map((code) => (
            <Link key={code} href={`/teams/${teamSlug(code) ?? ""}`}>
              <TeamChip team={teamName(code)} accent={teamAccent(code)} size="sm" />
            </Link>
          ))}
          {recap.teamsOnBye.length > 0 && (
            <span className="day-head__meta">
              Bye: {recap.teamsOnBye.map(teamName).join(", ")}
            </span>
          )}
        </div>
      </section>

      {/*
        Build-time HTML from `npm run recaps`, stripped of internal notes by the
        build script. Never user input, and never fetched at runtime.
      */}
      <article
        className="recap"
        dangerouslySetInnerHTML={{ __html: recap.html }}
      />

      <section>
        <Link href="/schedule" className="section__link">
          Full schedule &amp; results →
        </Link>
      </section>
    </div>
  );
}
