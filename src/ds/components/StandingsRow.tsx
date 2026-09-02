import { RankBadge } from "./RankBadge";

export interface StandingsRowProps {
  /** Position in the table. 1–3 get a medal badge. */
  rank: number;
  /** Player / gamertag. */
  player: string;
  /** Team name or abbreviation. */
  team: string;
  /** The ranked figure — Player Value, points, etc. Pass a number to get `$10,000` formatting, or a preformatted string. */
  value: number | string;
  /** Prefix shown when `value` is a number. Default `"$"`. */
  valuePrefix?: string;
  /** De-emphasize the value (e.g. for teams below the cut line). */
  muted?: boolean;
  className?: string;
}

function formatValue(value: number | string, prefix: string): string {
  if (typeof value === "string") return value;
  return `${prefix}${value.toLocaleString("en-US")}`;
}

/**
 * One row of an RPL standings table: rank badge, a gold tick, player name with
 * team, and the ranked figure. Composes RankBadge.
 */
export function StandingsRow({
  rank,
  player,
  team,
  value,
  valuePrefix = "$",
  muted = false,
  className,
}: StandingsRowProps) {
  const classes = ["rpl-standings-row", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <RankBadge rank={rank} size="md" />
      <span className="rpl-standings-row__tick" />
      <div className="rpl-standings-row__names">
        <div className="rpl-standings-row__player">{player}</div>
        <div className="rpl-standings-row__team">{team}</div>
      </div>
      <div
        className={
          "rpl-standings-row__value" +
          (muted ? " rpl-standings-row__value--muted" : "")
        }
      >
        {formatValue(value, valuePrefix)}
      </div>
    </div>
  );
}
