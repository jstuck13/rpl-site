import type { CSSProperties } from "react";

export interface MatchupTeam {
  /** Team name or abbreviation. */
  name: string;
  /** Optional record / seed line, e.g. `"12–3"` or `"#1 SEED"`. */
  record?: string;
  /** Team accent color (hex) for this side's underline. Defaults to the neutral accent. */
  accent?: string;
}

export type MatchupHeaderSize = "sm" | "md" | "lg";

export interface MatchupHeaderProps {
  /** Left team. */
  home: MatchupTeam;
  /** Right team. */
  away: MatchupTeam;
  /** Uppercase label above the matchup, e.g. `"Series 1"` or `"Grand Final"`. */
  label?: string;
  /** Team-name scale. `sm` 30px, `md` 40px (default), `lg` 54px for a hero matchup. Long club names wrap under a full-width underline. */
  size?: MatchupHeaderSize;
  /** Series score. When set, replaces the center VS diamond with `H–A`. */
  homeScore?: number;
  /** Series score for the away side. */
  awayScore?: number;
  className?: string;
}

/**
 * A head-to-head header: two team names over their own accent-colored
 * underlines with a center VS diamond (or the running series score). Works
 * as a graphic band or an on-stream overlay.
 */
export function MatchupHeader({
  home,
  away,
  label,
  size = "md",
  homeScore,
  awayScore,
  className,
}: MatchupHeaderProps) {
  const classes = ["rpl-matchup", `rpl-matchup--${size}`, className]
    .filter(Boolean)
    .join(" ");
  const hasScore = homeScore != null && awayScore != null;
  const style = {
    ...(home.accent ? { "--rpl-matchup-home-accent": home.accent } : {}),
    ...(away.accent ? { "--rpl-matchup-away-accent": away.accent } : {}),
  } as CSSProperties;

  return (
    <div className={classes} style={style}>
      {label && <div className="rpl-matchup__label">{label}</div>}
      <div className="rpl-matchup__grid">
        <div className="rpl-matchup__side rpl-matchup__side--home">
          <div className="rpl-matchup__team">{home.name}</div>
          {home.record && <div className="rpl-matchup__record">{home.record}</div>}
        </div>

        {hasScore ? (
          <div className="rpl-matchup__score">
            {homeScore}–{awayScore}
          </div>
        ) : (
          <div className="rpl-matchup__vs">
            <span>VS</span>
          </div>
        )}

        <div className="rpl-matchup__side rpl-matchup__side--away">
          <div className="rpl-matchup__team">{away.name}</div>
          {away.record && <div className="rpl-matchup__record">{away.record}</div>}
        </div>
      </div>
    </div>
  );
}
