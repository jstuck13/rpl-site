import type { CSSProperties } from "react";

export interface ScorebugProps {
  /** Home team name (left side). */
  home: string;
  /** Away team name (right side). */
  away: string;
  /** Games won by the home side in this series. */
  homeScore: number;
  /** Games won by the away side in this series. */
  awayScore: number;
  /** Center diamond label — the game being played now, e.g. `"G3"`. */
  game?: string;
  /** Uppercase caption strip under the bar — the series context, e.g. `"RPL · Season 2 · Grand Final"`. */
  caption?: string;
  /** Which side is orange. Default `"home"`; the other side is blue. */
  orangeSide?: "home" | "away";
  /** Size multiplier for the whole bug. Default `1`. */
  scale?: number;
  className?: string;
}

/**
 * The live series scorebug: a skewed orange-vs-blue bar with team names, the
 * series score (games won), a gold center diamond for the current game, and an
 * optional caption. Renders on a transparent background for use as an OBS overlay.
 */
export function Scorebug({
  home,
  away,
  homeScore,
  awayScore,
  game,
  caption,
  orangeSide = "home",
  scale = 1,
  className,
}: ScorebugProps) {
  const homeMod = orangeSide === "home" ? "o" : "b";
  const awayMod = orangeSide === "home" ? "b" : "o";
  const style = { "--rpl-sb-scale": String(scale) } as CSSProperties;
  const classes = ["rpl-scorebug", className].filter(Boolean).join(" ");

  return (
    <div className={classes} style={style}>
      {game && (
        <div className="rpl-scorebug__node">
          <span className="rpl-scorebug__node-label">{game}</span>
        </div>
      )}
      <div className="rpl-scorebug__bar">
        <div className={`rpl-scorebug__seg rpl-scorebug__name rpl-scorebug__seg--${homeMod}`}>
          <span className="rpl-scorebug__u">{home}</span>
        </div>
        <div className={`rpl-scorebug__seg rpl-scorebug__score rpl-scorebug__seg--${homeMod}`}>
          <span className="rpl-scorebug__u">{homeScore}</span>
        </div>
        <div className="rpl-scorebug__seg rpl-scorebug__mid" />
        <div className={`rpl-scorebug__seg rpl-scorebug__score rpl-scorebug__seg--${awayMod}`}>
          <span className="rpl-scorebug__u">{awayScore}</span>
        </div>
        <div className={`rpl-scorebug__seg rpl-scorebug__name rpl-scorebug__seg--${awayMod}`}>
          <span className="rpl-scorebug__u">{away}</span>
        </div>
      </div>
      {caption && <div className="rpl-scorebug__caption">{caption}</div>}
    </div>
  );
}
