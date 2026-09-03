import { Suspense } from "react";
import type { Metadata } from "next";
import { awards } from "@/lib/awards";
import { AwardsOverlay } from "@/components/AwardsOverlay";

export const metadata: Metadata = {
  title: "Awards overlay",
  // Never wanted in search results — it's a graphic, not a page.
  robots: { index: false, follow: false },
};

export default function AwardsOverlayPage() {
  return (
    <>
      {/*
        The root layout always applies in the App Router, so the overlay strips
        the site chrome and the page background here rather than opting out of
        it. OBS composites whatever the page doesn't paint, so the body has to
        be genuinely transparent — its own default `background-image` would
        otherwise survive OBS's built-in `background-color: transparent`.
      */}
      <style>{`
        body { background: none !important; }
        .site-header, .site-footer { display: none !important; }
        .main { padding: 0 !important; }
      `}</style>
      {/* The overlay reads its position and timing from the query string, so
          it renders on the client inside this boundary while the page itself
          stays static. */}
      <Suspense fallback={null}>
        <AwardsOverlay awards={awards()} />
      </Suspense>
    </>
  );
}
