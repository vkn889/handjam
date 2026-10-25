"use client";

import type { EngineState } from "@/components/HandOverlay";

/** Pops up for a moment when you land a combo: name, points, chain multiplier. */
export function ComboToast({ session }: { session: EngineState["session"] }) {
  const hit = session?.last;
  if (!session || !hit || session.seconds - hit.at > 1.8) return null;
  return (
    <div key={hit.at} className="combo-pop pointer-events-none mt-3 text-center">
      <p className="hud-text text-2xl font-semibold tracking-wide text-[#E8FF1F]">{hit.name.toUpperCase()}</p>
      <p className="hud-text text-sm text-white/90">
        {hit.points > 0 ? `+${hit.points}` : "Tired: try a different combo"}
        {hit.mult > 1 && ` · chain ×${hit.mult.toFixed(2)}`}
      </p>
    </div>
  );
}
