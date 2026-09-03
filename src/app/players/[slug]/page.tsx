import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamChip } from "@/ds/components/TeamChip";
import {
  CURRENT_SEASON,
  allSeasons,
  formatMoney,
  formatNum,
  playerBySlug,
  playerHistory,
  profileBySlug,
  type Player,
} from "@/lib/data";
import { teamAccent, teamName } from "@/lib/teams";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  const slugs = new Set<string>();
  for (const season of allSeasons()) {
    for (const player of season.players) slugs.add(player.slug);
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const player =
    playerBySlug(slug) ?? playerHistory(slug).at(-1)?.player ?? null;
  return { title: player ? player.name : "Player" };
}

function Stat({
  label,
  value,
  gold = false,
}: {
  label: string;
  value: string | number;
  gold?: boolean;
}) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <div className={`stat__value${gold ? " stat__value--gold" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function SeasonBlock({ season, player }: { season: number; player: Player }) {
  const { totals, averages, valuation } = player;
  const hasStats = totals.games !== null && totals.games > 0;

  return (
    <section>
      <div className="section__head">
        <h2 className="section__title">Season {season}</h2>
        <span className="section__link">{teamName(player.team)}</span>
      </div>

      {!hasStats ? (
        <p className="note">
          No games logged yet this season — {player.name}&apos;s value is still
          carried entirely from their prior value.
        </p>
      ) : (
        <>
          <div className="grid grid--stats">
            <Stat label="Games" value={totals.games ?? "—"} />
            <Stat label="Goals" value={totals.goals ?? "—"} />
            <Stat label="Assists" value={totals.assists ?? "—"} />
            <Stat label="Saves" value={totals.saves ?? "—"} />
            <Stat label="Shots" value={totals.shots ?? "—"} />
            <Stat label="Points" value={totals.points ?? "—"} />
          </div>

          <div className="grid grid--stats" style={{ marginTop: "16px" }}>
            <Stat label="Avg goals" value={formatNum(averages.goals)} />
            <Stat label="Avg assists" value={formatNum(averages.assists)} />
            <Stat label="Avg saves" value={formatNum(averages.saves)} />
            <Stat label="Avg shots" value={formatNum(averages.shots)} />
            <Stat
              label="Avg points"
              value={formatNum(averages.points)}
              gold
            />
          </div>

          <div className="panel table-scroll" style={{ marginTop: "24px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Valuation step</th>
                  <th className="num">Figure</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Prior value</td>
                  <td className="num">{formatMoney(player.priorValue)}</td>
                </tr>
                <tr>
                  <td>Base value</td>
                  <td className="num">{formatMoney(valuation.baseValue)}</td>
                </tr>
                <tr>
                  <td>Vs rank baseline</td>
                  <td className="num">
                    {valuation.vsRankBaselinePct === null
                      ? "—"
                      : `${valuation.vsRankBaselinePct.toFixed(1)}%`}
                  </td>
                </tr>
                <tr>
                  <td>Modifier</td>
                  <td className="num">{formatMoney(valuation.modifier)}</td>
                </tr>
                <tr>
                  <td>Season value</td>
                  <td className="num">{formatMoney(valuation.seasonValue)}</td>
                </tr>
                <tr>
                  <td>Weight on prior</td>
                  <td className="num">
                    {valuation.weightOnPriorPct === null
                      ? "—"
                      : `${valuation.weightOnPriorPct.toFixed(1)}%`}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Player Value</strong>
                  </td>
                  <td className="value">
                    {formatMoney(valuation.playerValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * The profile write-ups, rendered from HTML generated at build time by
 * `npm run profiles`. The source is Jacob's own profile documents, run through
 * a strip pass that removes his internal working notes — never user input, and
 * never fetched at runtime.
 */
function ProfileBlock({ slug }: { slug: string }) {
  const profile = profileBySlug(slug);
  if (!profile) return null;

  return (
    <section className="profile">
      {profile.intro && (
        <div
          className="profile__intro"
          dangerouslySetInnerHTML={{ __html: profile.intro }}
        />
      )}
      {profile.sections.map((section) => (
        <div key={section.heading} className="profile__section">
          <h2 className="profile__heading">{section.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: section.html }} />
        </div>
      ))}
    </section>
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const history = playerHistory(slug);
  if (history.length === 0) notFound();

  const current = history.find((h) => h.season === CURRENT_SEASON)?.player;
  const latest = current ?? history.at(-1)!.player;

  return (
    <div className="shell stack">
      <div>
        <Link href="/players" className="back-link">
          ← All players
        </Link>
      </div>

      <section className="player-head">
        <div>
          <h1 className="player-head__name">{latest.name}</h1>
          <div className="player-head__meta">
            {latest.team && (
              <TeamChip team={teamName(latest.team)} accent={teamAccent(latest.team)} size="sm" />
            )}
            {latest.rank && <span className="tag">{latest.rank}</span>}
            {latest.isManager && (
              <span className="tag tag--manager">Manager</span>
            )}
            {latest.status === "Exempt" && (
              <span className="tag tag--exempt">Exempt</span>
            )}
            {latest.status === "Inactive" && (
              <span className="tag tag--inactive">Inactive</span>
            )}
          </div>
        </div>
        <div className="player-head__value">
          <p className="stat__label">Player Value</p>
          <div className="stat__value stat__value--gold">
            {formatMoney(latest.valuation.playerValue)}
          </div>
        </div>
      </section>

      {latest.estimatedPriorValue && (
        <p className="note">
          <strong>Estimated prior value.</strong> {latest.name} had no prior RPL
          season, so their starting value was seeded from the average value at
          their in-game rank rather than carried forward from real results.
        </p>
      )}

      <ProfileBlock slug={slug} />

      {[...history].reverse().map(({ season, player }) => (
        <SeasonBlock key={season} season={season} player={player} />
      ))}
    </div>
  );
}
