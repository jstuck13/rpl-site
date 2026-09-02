import type { Metadata } from "next";
import Link from "next/link";
import "@/ds/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rocket Premier League",
    template: "%s · RPL",
  },
  description:
    "Standings, player values, schedule and stats for the Rocket Premier League.",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
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
            </nav>
          </div>
        </header>

        <main className="main">{children}</main>

        <footer className="site-footer">
          <div className="shell">
            Rocket Premier League · values from RPL_Master_Tracker
          </div>
        </footer>
      </body>
    </html>
  );
}
