export type StatTileTone = "neutral" | "gold" | "good" | "warn" | "danger";
export type StatTileSize = "sm" | "md" | "lg";

export interface StatTileProps {
  /** Metric name, e.g. "Boost Stolen" or "Goals". */
  label: string;
  /** The figure. Numbers are locale-formatted; pass a string for units ("62%", "1.4k"). */
  value: number | string;
  /** Optional context line under the value — a delta, rank, or comparison. */
  sublabel?: string;
  /** Accent color for the top rule and sublabel. `gold` also tints the value. */
  tone?: StatTileTone;
  /** Tile size / value scale. */
  size?: StatTileSize;
  /** Center-align the contents. */
  center?: boolean;
  className?: string;
}

/**
 * A single headline metric: a large tabular figure, an uppercase label, and an
 * optional context line, on a dark panel with a colored top rule.
 */
export function StatTile({
  label,
  value,
  sublabel,
  tone = "neutral",
  size = "md",
  center = false,
  className,
}: StatTileProps) {
  const classes = [
    "rpl-stat",
    `rpl-stat--${size}`,
    tone !== "neutral" && `rpl-stat--${tone}`,
    center && "rpl-stat--center",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const display =
    typeof value === "number" ? value.toLocaleString("en-US") : value;

  return (
    <div className={classes}>
      <div className="rpl-stat__value">{display}</div>
      <div className="rpl-stat__label">{label}</div>
      {sublabel && <div className="rpl-stat__sub">{sublabel}</div>}
    </div>
  );
}
