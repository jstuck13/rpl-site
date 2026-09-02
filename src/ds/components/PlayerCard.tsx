import { RankBadge } from "./RankBadge";
import { TeamChip } from "./TeamChip";

export interface PlayerCardStat {
  label: string;
  value: string | number;
}

export interface PlayerCardProps {
  /** Player / gamertag. */
  player: string;
  /** Team name or abbreviation. */
  team: string;
  /** Headline figure (Player Value, MVP score…). */
  value?: string | number;
  /** Small uppercase caption above the value. Default `"Player Value"`. */
  valueLabel?: string;
  /** Show a RankBadge in the top-left of the media area. */
  rank?: number;
  /** Headshot URL. Falls back to the player's initials on a gold-lit panel. */
  imageUrl?: string;
  /** Up to 3 secondary stats shown in a row under the name. */
  stats?: PlayerCardStat[];
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A framed player panel: headshot (or initials), name, team tag, a headline
 * figure, and an optional row of secondary stats. Composes RankBadge + TeamChip.
 */
export function PlayerCard({
  player,
  team,
  value,
  valueLabel = "Player Value",
  rank,
  imageUrl,
  stats,
  className,
}: PlayerCardProps) {
  const classes = ["rpl-playercard", className].filter(Boolean).join(" ");
  const displayValue =
    typeof value === "number" ? value.toLocaleString("en-US") : value;

  return (
    <div className={classes}>
      <div className="rpl-playercard__media">
        {imageUrl ? (
          <img className="rpl-playercard__photo" src={imageUrl} alt={player} />
        ) : (
          <span className="rpl-playercard__initials">{initialsOf(player)}</span>
        )}
        {rank != null && (
          <div className="rpl-playercard__rank">
            <RankBadge rank={rank} size="md" />
          </div>
        )}
      </div>
      <div className="rpl-playercard__body">
        <div className="rpl-playercard__name">{player}</div>
        <div className="rpl-playercard__meta">
          <TeamChip team={team} size="sm" />
          {value != null && (
            <div className="rpl-playercard__value">
              <div className="rpl-playercard__valuelabel">{valueLabel}</div>
              {displayValue}
            </div>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="rpl-playercard__stats">
            {stats.map((s) => (
              <div className="rpl-playercard__stat" key={s.label}>
                <span className="rpl-playercard__statvalue">
                  {typeof s.value === "number"
                    ? s.value.toLocaleString("en-US")
                    : s.value}
                </span>
                <span className="rpl-playercard__statlabel">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
