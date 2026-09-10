import { CURRENT_SEASON } from "@/lib/data";
import { DAYS_PLAYED, DAYS_TOTAL } from "@/lib/season";
import { ogCard } from "@/lib/og";

export { size, contentType } from "@/lib/og";
export const alt = "Rocket Premier League";

/**
 * The site-wide card. Every route without its own opengraph-image inherits
 * this one, so /standings, /schedule, /leaderboard and the rest are covered
 * without a file each.
 */
export default function Image() {
  return ogCard({
    eyebrow: "Community-run · Auction-drafted · Season-long",
    title: "Rocket Premier League",
    subtitle:
      `Season ${CURRENT_SEASON}, match day ${DAYS_PLAYED} of ${DAYS_TOTAL} — ` +
      "standings, player values, and the story of every match night.",
  });
}
