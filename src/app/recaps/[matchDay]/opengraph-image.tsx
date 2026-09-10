import { RECAPS, formatDate, recapByMatchDay } from "@/lib/recaps";
import { ogCard } from "@/lib/og";

export { size, contentType } from "@/lib/og";
export const alt = "RPL match day recap";

type Params = { matchDay: string };

export function generateStaticParams(): Params[] {
  return RECAPS.map((r) => ({ matchDay: String(r.matchDay) }));
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { matchDay } = await params;
  const recap = recapByMatchDay(Number(matchDay));

  if (!recap) {
    return ogCard({ eyebrow: "Rocket Premier League", title: "Match day" });
  }

  return ogCard({
    eyebrow: `Match Day ${recap.matchDay} · ${formatDate(recap.date)}`,
    title: recap.headline,
    footer: `rpl-site.vercel.app/recaps/${recap.matchDay}`,
  });
}
