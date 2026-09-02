"use client";

import { useState, type ReactNode } from "react";

export interface SeasonTab {
  season: number;
  content: ReactNode;
}

/**
 * Season switcher for the players table. Both seasons are rendered on the
 * server and handed over as children — this only picks which one is on screen,
 * so the page stays static and switching costs no request.
 */
export function SeasonTabs({
  tabs,
  initial,
}: {
  tabs: SeasonTab[];
  initial: number;
}) {
  const [active, setActive] = useState(initial);
  const current = tabs.find((t) => t.season === active) ?? tabs[0];

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Season">
        {tabs.map((tab) => (
          <button
            key={tab.season}
            type="button"
            role="tab"
            id={`season-tab-${tab.season}`}
            aria-selected={tab.season === current.season}
            aria-controls="season-panel"
            className={`tabs__tab${
              tab.season === current.season ? " tabs__tab--active" : ""
            }`}
            onClick={() => setActive(tab.season)}
          >
            Season {tab.season}
          </button>
        ))}
      </div>
      <div
        id="season-panel"
        role="tabpanel"
        aria-labelledby={`season-tab-${current.season}`}
      >
        {current.content}
      </div>
    </>
  );
}
