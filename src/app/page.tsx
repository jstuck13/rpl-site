import Link from "next/link";
import {
  CURRENT_SEASON,
  formatMoney,
  leaderboard,
  rosters,
  type Player,
} from "@/lib/data";
import { DAYS_PLAYED, DAYS_TOTAL, MATCH_DAYS, standings } from "@/lib/season";
import { formatDate, latestRecap } from "@/lib/recaps";
import { formatTime, nextUp } from "@/lib/next-up";
import { awards } from "@/lib/awards";
import { standingsMovement, teamStreaks } from "@/lib/currently";
import { teamAccent, teamName } from "@/lib/teams";
import { AwardsBug } from "@/components/AwardsBug";

/**
 * What the Currently sliver teases, in priority order — the most interesting
 * true thing rather than always the same stat: standings movement > an
 * active streak > the tightest award race > a quiet fallback for when
 * nothing's happened yet (early Season 2 has only one match day logged).
 */
function currentlyHeadline(
  movement: ReturnType<typeof standingsMovement>,
  streaks: ReturnType<typeof teamStreaks>,
  races: ReturnType<typeof awards>
): string {
  if (movement.length > 0) {
    const m = movement[0];
    return `${m.name} ${m.delta > 0 ? "climbed to" : "slid to"} #${m.currentRank}`;
  }
  if (streaks.length > 0) {
    const s = streaks[0];
    return `${s.name} is on a ${s.length}-game ${s.result === "W" ? "win" : "loss"} streak`;
  }
  if (races.length > 0) {
    const top = races[0];
    const leaders = top.holders.map((h) => h.name).join(", ");
    return `${leaders} lead${top.holders.length === 1 ? "s" : ""} the ${top.name} race`;
  }
  return "Nothing's moved yet — check back after Match Day 2.";
}

interface Improved {
  name: string;
  slug: string;
  delta: number;
}

/**
 * Biggest season-to-date value gain, league-wide — current Player Value
 * minus Prior Value. NOT a rolling "last N match days" window: the site only
 * ever has a current snapshot of Player Value (from the tracker), never a
 * history of it per match day, so there's nothing to diff a recent window
 * against. A true windowed version needs the data pipeline to start
 * snapshotting values after each `npm run data` run — not something this
 * session can add (no shell here). Deliberately includes players whose
 * Prior Value was estimated rather than carried from a real prior season —
 * Jacob asked not to exclude them.
 */
function mostImproved(players: Player[]): Improved | null {
  let best: Improved | null = null;
  for (const p of players) {
    if (p.priorValue === null || p.valuation.playerValue === null) continue;
    const delta = p.valuation.playerValue - p.priorValue;
    if (best === null || delta > best.delta) {
      best = { name: p.name, slug: p.slug, delta };
    }
  }
  return best;
}

function formatDelta(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

export default function HomePage() {
  const recap = latestRecap();
  const next = nextUp();
  const races = awards();
  const board = leaderboard();
  const top = board.slice(0, 3);
  const squads = rosters();
  const table = standings();
  const standingsTop3 = table.filter((row) => row.played).slice(0, 3);
  const movement = standingsMovement();
  const streaks = teamStreaks();
  const seriesPlayed = MATCH_DAYS.reduce(
    (sum, day) => sum + day.series.length,
    0
  );
  const improved = mostImproved(board);

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">Community-run · Auction-drafted · Season-long</p>
        <h1 className="hero__title">
          Rocket <em>Premier League</em>
        </h1>
        <p className="hero__lede">
          A community-run Rocket League circuit, built by and for the people
          playing it — an ongoing institution meant to grow season after
          season, and open to new players as it evolves.
        </p>

        <div className="hero-links">
          <span className="tag">
            Season {CURRENT_SEASON} · Match Day {DAYS_PLAYED} of {DAYS_TOTAL}
          </span>
          <Link href="/about" className="section__link">
            About the league →
          </Link>
          <Link href="/join" className="section__link">
            Want to play? →
          </Link>
        </div>
      </section>

      <AwardsBug
        awards={races}
        through={`Season ${CURRENT_SEASON} · through Match Day ${DAYS_PLAYED}`}
      />

      <section>
        <div className="section__head">
          <h2 className="section__title">Season {CURRENT_SEASON} at a glance</h2>
        </div>
        <div className="grid grid--stats">
          <div className="stat">
            <p className="stat__label">Teams</p>
            <div className="stat__value">{squads.length}</div>
          </div>
          <div className="stat">
            <p className="stat__label">Players</p>
            <div className="stat__value">{board.length}</div>
          </div>
          <div className="stat">
            <p className="stat__label">Series played</p>
            <div className="stat__value">{seriesPlayed}</div>
          </div>
          <div className="stat">
            <p className="stat__label">Most improved</p>
            <div className="stat__value stat__value--gold">
              {improved ? formatDelta(improved.delta) : "—"}
            </div>
            {improved && <p className="stat__sub">{improved.name}</p>}
          </div>
        </div>
      </section>

      <section>
        <div className="section__head">
          <h2 className="section__title">Around the league</h2>
        </div>
        <div className="sliver-stack">
          <Link href="/currently" className="sliver">
            <div className="sliver__head">
              <p className="sliver__eyebrow">Right now</p>
              <p className="sliver__title">Currently</p>
            </div>
            <div className="sliver__body">
              <p className="sliver__headline">
                {currentlyHeadline(movement, streaks, races)}
              </p>
            </div>
            <span className="sliver__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/standings" className="sliver">
            <div className="sliver__head">
              <p className="sliver__eyebrow">Season {CURRENT_SEASON}</p>
              <p className="sliver__title">Standings</p>
            </div>
            <div className="sliver__body">
              {standingsTop3.length > 0 ? (
                <ul className="sliver__items">
                  {standingsTop3.map((row, i) => (
                    <li key={row.code} className="sliver__item">
                      <span className="sliver__item-rank">{i + 1}</span>
                      <span
                        className="team-dot"
                        style={{ background: teamAccent(row.code) }}
                      />
                      {row.name}
                      <span className="sliver__item-value">
                        {row.wins}-{row.losses}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sliver__headline">
                  Season {CURRENT_SEASON} kicks off soon.
                </p>
              )}
            </div>
            <span className="sliver__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/schedule" className="sliver">
            <div className="sliver__head">
              <p className="sliver__eyebrow">Up next</p>
              <p className="sliver__title">Schedule</p>
            </div>
            <div className="sliver__body">
              {next ? (
                <>
                  <p className="sliver__headline">
                    {next.series
                      .map((series) => series.clubs.map(teamName).join(" v "))
                      .join(", ")}
                  </p>
                  <p className="sliver__meta">
                    {next.date
                      ? [formatDate(next.date), formatTime(next)]
                          .filter(Boolean)
                          .join(" · ")
                      : "Date TBD"}
                  </p>
                </>
              ) : (
                <p className="sliver__headline">
                  Nothing on the board right now.
                </p>
              )}
            </div>
            <span className="sliver__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/recaps" className="sliver">
            <div className="sliver__head">
              <p className="sliver__eyebrow">Latest</p>
              <p className="sliver__title">Recaps</p>
            </div>
            <div className="sliver__body">
              {recap ? (
                <>
                  <p className="sliver__headline">{recap.headline}</p>
                  <p className="sliver__meta">
                    Match Day {recap.matchDay} · {formatDate(recap.date)}
                  </p>
                </>
              ) : (
                <p className="sliver__headline">No recaps yet.</p>
              )}
            </div>
            <span className="sliver__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/leaderboard" className="sliver">
            <div className="sliver__head">
              <p className="sliver__eyebrow">Player Value</p>
              <p className="sliver__title">Leaderboard</p>
            </div>
            <div className="sliver__body">
              <ul className="sliver__items">
                {top.map((p, i) => (
                  <li key={p.slug} className="sliver__item">
                    <span className="sliver__item-rank">{i + 1}</span>
                    {p.name}
                    <span className="sliver__item-value">
                      {formatMoney(p.valuation.playerValue)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <span className="sliver__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/teams" className="sliver">
            <div className="sliver__head">
              <p className="sliver__eyebrow">{squads.length} clubs</p>
              <p className="sliver__title">Teams</p>
            </div>
            <div className="sliver__body">
              <ul className="sliver__items">
                {squads.map((team) => (
                  <li key={team.code} className="sliver__item">
                    <span
                      className="team-dot"
                      style={{ background: teamAccent(team.code) }}
                    />
                    {team.name}
                  </li>
                ))}
              </ul>
            </div>
            <span className="sliver__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
