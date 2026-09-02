export type RankBadgeSize = "sm" | "md" | "lg";

export interface RankBadgeProps {
  /** Finishing position. 1 / 2 / 3 automatically take gold / silver / bronze. */
  rank: number;
  /** Badge footprint. `sm` 28px, `md` 40px, `lg` 56px. */
  size?: RankBadgeSize;
  /** Force a medal treatment (or force it off) regardless of rank. */
  medal?: "gold" | "silver" | "bronze" | "none";
  className?: string;
}

const MEDAL_BY_RANK: Record<number, "gold" | "silver" | "bronze"> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

/**
 * A ranked-position chip. The podium places (1–3) render as gold, silver and
 * bronze medals; everything below is a plain dark chip.
 */
export function RankBadge({
  rank,
  size = "md",
  medal,
  className,
}: RankBadgeProps) {
  const resolved = medal ?? MEDAL_BY_RANK[rank] ?? "none";
  const classes = [
    "rpl-rank",
    `rpl-rank--${size}`,
    resolved !== "none" && `rpl-rank--${resolved}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{rank}</div>;
}
