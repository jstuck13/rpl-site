export type TeamChipSize = "sm" | "md" | "lg";

export interface TeamChipProps {
  /** Team name or abbreviation — whatever fits the graphic ("FWG" or "Fortnite Flick FC"). */
  team: string;
  /** Pill size. */
  size?: TeamChipSize;
  className?: string;
}

/**
 * A team tag — an uppercase label pill. Use it wherever a team needs to be
 * named inline: standings rows, player cards, bye lists, matchup captions.
 */
export function TeamChip({ team, size = "md", className }: TeamChipProps) {
  const classes = ["rpl-teamchip", `rpl-teamchip--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{team}</span>;
}
