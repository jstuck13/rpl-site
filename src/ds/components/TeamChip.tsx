import type { CSSProperties } from "react";

export type TeamChipSize = "sm" | "md" | "lg";

export interface TeamChipProps {
  /** Team name or abbreviation — whatever fits the graphic ("FWG" or "Fortnite Flick FC"). */
  team: string;
  /** Pill size. */
  size?: TeamChipSize;
  /** Team accent color (hex). Renders a small identity dot before the label.
   * Omit for a plain, uncolored pill. */
  accent?: string;
  className?: string;
}

/**
 * A team tag — an uppercase label pill, with an optional colored dot when a
 * team accent is known. Use it wherever a team needs to be named inline:
 * standings rows, player cards, bye lists, matchup captions.
 */
export function TeamChip({ team, size = "md", accent, className }: TeamChipProps) {
  const classes = ["rpl-teamchip", `rpl-teamchip--${size}`, className]
    .filter(Boolean)
    .join(" ");
  const style = accent ? ({ "--rpl-chip-accent": accent } as CSSProperties) : undefined;

  return (
    <span className={classes} style={style}>
      {accent && <span className="rpl-teamchip__dot" />}
      {team}
    </span>
  );
}
