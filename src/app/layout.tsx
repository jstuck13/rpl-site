import type { Metadata } from "next";
import Link from "next/link";
import "@/ds/styles.css";
import "./globals.css";
import { CURRENT_SEASON } from "@/lib/data";

export const metadata: Metadata = {
  title: {
    default: "Rocket Premier League",
    template: "%s · RPL",
  },
  description:
    "Standings, player values, schedule and stats for the Rocket Premier League.",
};

/**
 * Mainstays vs. season-scoped: Home/About/Players are evergreen (a player
 * page spans multiple seasons; About explains the concept once). Standings,
 * Schedule, Recaps, Leaderboard, and Teams are all specific to whichever
 * season is current — rosters and results reset every season — so they live
 * under the "Seasons" dropdown instead of cluttering the top level.
 *
 * The dropdown is grouped rather than flat, because the two kinds of entry in
 * it are not peers: the current season has MANY views (standings, schedule,
 * …) while a finished season has exactly ONE page. A flat list makes
 * "Season 1" read as a sibling of "Standings", i.e. as Season 1's standings.
 * The headings make the asymmetry legible, and it is permanent — every season
 * ends up as a single archive row once the next one starts.
 *
 * At rollover this is a data change, not a restructure: the current-season
 * list keeps its hrefs, and the season that just ended joins PAST_SEASONS.
 *
 * When PAST_SEASONS grows past two or three, this menu gets long and the
 * right move is to promote seasons to hub pages (/seasons/2 and so on) and
 * let the home page's sliver stack be the current season's hub — it already
 * is one. Not worth doing for a single archived season.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
  { href: "/players", label: "Players" },
];

const CURRENT_SEASON_NAV = [
  { href: "/currently", label: "Currently" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/recaps", label: "Recaps" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/teams", label: "Teams" },
  { href: "/draft", label: "Draft" },
];

/** Finished seasons, newest first. One page each. */
const PAST_SEASONS = [{ href: "/seasons/1", label: "Season 1" }];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell site-header__inner">
            <Link href="/" className="site-header__brand">
              Rocket Premier League
            </Link>
            <nav className="site-nav">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              {/*
                CSS-only dropdown: :hover and :focus-within both drive
                visibility (see globals.css), so it opens on mouse and on
                keyboard tab, and tabbing through the revealed links keeps
                :focus-within true the whole way through. No client JS.
              */}
              <div className="site-nav__dropdown">
                <button
                  type="button"
                  className="site-nav__dropdown-trigger"
                  aria-haspopup="true"
                >
                  Seasons
                  <span className="site-nav__caret" aria-hidden="true" />
                </button>
                <div className="site-nav__dropdown-menu">
                  <p className="site-nav__dropdown-heading">
                    Season {CURRENT_SEASON}
                  </p>
                  {CURRENT_SEASON_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="site-nav__dropdown-link"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <p className="site-nav__dropdown-heading site-nav__dropdown-heading--past">
                    Past
                  </p>
                  {PAST_SEASONS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="site-nav__dropdown-link"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/join" className="site-nav__cta">
                Play in RPL
              </Link>
            </nav>
          </div>
        </header>

        <main className="main">{children}</main>

        <footer className="site-footer">
          <div className="shell">
            Rocket Premier League · values from RPL_Master_Tracker ·{" "}
            <Link href="/join" className="site-footer__link">
              play in the next season
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
