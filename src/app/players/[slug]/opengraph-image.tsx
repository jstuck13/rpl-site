import {
  formatMoney,
  playerBySlug,
  playerHistory,
  allSeasons,
} from "@/lib/data";
import { teamAccent, teamName } from "@/lib/teams";
import { ogCard } from "@/lib/og";

export { size, contentType } from "@/lib/og";
export const alt = "RPL player";

type Params = { slug: string };

/** Mirrors the page's own params so a card is built for every player page. */
export function generateStaticParams(): Params[] {
  const slugs = new Set<string>();
  for (const season of allSeasons()) {
    for (const player of season.players) slugs.add(player.slug);
  }
  return [...slugs].map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const history = playerHistory(slug);
  const player = playerBySlug(slug) ?? history.at(-1)?.player ?? null;

  if (!player) {
    return ogCard({ eyebrow: "Rocket Premier League", title: "Player" });
  }

  const value = player.valuation.playerValue;
  const club = player.team ? teamName(player.team) : null;

  // Career totals, so an alumnus's card isn't empty just because he isn't
  // rostered this season.
  const goals = history.reduce((n, h) => n + (h.player.totals.goals ?? 0), 0);
  const assists = history.reduce((n, h) => n + (h.player.totals.assists ?? 0), 0);

  // Seasons he actually PLAYED, not seasons he has a row in. An alumnus who
  // sat out has an Inactive row in the current season, and counting it would
  // claim a season he never played.
  const seasons = history.filter((h) => (h.player.totals.games ?? 0) > 0).length;

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const bits = [
    value !== null ? `Player Value ${formatMoney(value)}` : null,
    goals || assists
      ? `${plural(goals, "goal")}, ${plural(assists, "assist")}`
      : null,
    seasons > 1 ? `${seasons} seasons` : null,
  ].filter(Boolean);

  return ogCard({
    eyebrow: club ? `Rocket Premier League · ${club}` : "Rocket Premier League",
    title: player.name,
    subtitle: bits.join(" · ") || undefined,
    accent: player.team ? teamAccent(player.team) : undefined,
    footer: `rpl-site.vercel.app/players/${slug}`,
  });
}
