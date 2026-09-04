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
 * under the "Season N" dropdown instead of cluttering the top level.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/players", label: "Players" },
];

const SEASON_NAV = [
  { href: "/currently", label: "Currently" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/recaps", label: "Recaps" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/teams", label: "Teams" },
];

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
                  Season {CURRENT_SEASON}
                  <span className="site-nav__caret" aria-hidden="true" />
                </button>
                <div className="site-nav__dropdown-menu">
                  {SEASON_NAV.map((item) => (
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
