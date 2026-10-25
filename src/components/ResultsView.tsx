"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { FinanceBento } from "@/components/ui/finance-bento";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { listSessions, type SessionSummary } from "@/lib/session";

/** End-of-session screen: Cognus earned and everything the session collected. */
export function ResultsView({ summary, onAgain }: { summary: SessionSummary | null; onAgain: () => void }) {
  const data = useMemo(() => {
    const all = listSessions();
    const current = summary ?? all[all.length - 1];
    if (!current) return null;
    return { current, history: all.filter((s) => s.id !== current.id) };
  }, [summary]);

  if (!data) {
    return (
      <div className="absolute inset-x-0 bottom-0 top-[76px] z-30 grid place-items-center bg-black/80">
        <p className="text-white/70">No sessions yet. Start one from the home screen.</p>
      </div>
    );
  }

  const b = data.current.breakdown;
  return (
    <div className="absolute inset-x-0 bottom-0 top-[76px] z-30 overflow-y-auto bg-black/85 px-4 py-6 backdrop-blur-md sm:px-6">
      <div className="mx-auto max-w-[1320px]">
        {summary && (
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Session complete</p>
              <p className="mt-1 text-5xl font-light">
                +<span className="text-[#E8FF1F]">{data.current.cognus}</span> Cognus
              </p>
              <p className="mt-2 text-sm text-white/60">
                Motion {b.motion} · Variety {b.variety} · Surprise {b.surprise} · Spread {b.spread} · Combos {b.combos} · Song switches {b.songs} · Resets {b.resets}
              </p>
            </div>
            <LiquidMetalButton label="Play again" width={160} icon={<RotateCcw size={15} />} onClick={onAgain} />
          </div>
        )}
        <FinanceBento data={data} title="Session" subtitle={new Date(data.current.startedAt).toLocaleString()} />
      </div>
    </div>
  );
}
