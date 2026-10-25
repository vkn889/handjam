"use client";

import { useState } from "react";
import { ExternalLink, Play, Search } from "lucide-react";
import MorphOrb from "@/components/ui/ai-thiking-orb-and-input";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { player } from "@/lib/engine";
import { rememberFound } from "@/lib/library";
import "@/app/orb.css";

interface Result {
  id: string;
  title: string;
  artist: string;
  art?: string;
  audio: string;
  kind: string;
  source: string;
  page?: string;
  links: Record<string, string>;
}
interface SearchResponse {
  summary: string;
  songs: Result[];
  free: Result[];
  related: Result[];
}

/** Type what you're after; the Python finder returns playable previews, free full tracks and related songs. */
export function FinderView({ onPlayed }: { onPlayed: () => void }) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(0); // remounts the orb for a fresh search
  const [loadingId, setLoadingId] = useState("");

  const search = async (q: string) => {
    setData(null);
    setQuery(q);
    try {
      const res = await fetch(`/api/py/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) return json.detail ?? "The finder couldn't search right now.";
      setData(json);
      return json.summary as string;
    } catch {
      return "The finder isn't reachable. Run npm run dev so the Python finder starts too.";
    }
  };

  const play = async (r: Result) => {
    setLoadingId(r.id);
    const track = { id: r.id, kind: "found" as const, title: r.title, subtitle: r.artist, url: r.audio, art: r.art, link: r.links.apple ?? r.page };
    rememberFound(track);
    await player.playTrack(track);
    setLoadingId("");
    onPlayed();
  };

  const showResults = data && phase === "answered";
  const newSearch = () => {
    setData(null);
    setPhase("idle");
    setRound((r) => r + 1);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-[76px] z-30 overflow-hidden">
      {/* Once results are in, the orb and its summary card step aside and the results take the middle. */}
      {!showResults && <MorphOrb key={round} onSubmit={search} onPhase={(p) => setPhase(p)} />}
      {showResults && (
        <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(120%_90%_at_50%_40%,rgba(20,20,28,.6),rgba(5,5,8,.9))] px-4 py-8">
          <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Results for</p>
                <h2 className="mt-1 text-4xl font-light">“{query}”</h2>
              </div>
              <LiquidMetalButton label="New search" width={156} icon={<Search size={15} />} onClick={newSearch} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Column title="Songs · 30 s previews" items={data.songs} onPlay={play} loadingId={loadingId} />
              <Column title="Free full tracks" items={data.free} onPlay={play} loadingId={loadingId} empty="No Creative Commons matches." />
              <Column title="Related" items={data.related} onPlay={play} loadingId={loadingId} empty="Nothing related found." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Column({ title, items, onPlay, loadingId, empty }: { title: string; items: Result[]; onPlay: (r: Result) => void; loadingId: string; empty?: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/55 p-3 backdrop-blur-md">
      <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{title}</h3>
      {!items.length && <p className="px-2 py-3 text-sm text-white/50">{empty ?? "Nothing here."}</p>}
      <ul className="space-y-1.5">
        {items.slice(0, 8).map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-white/5">
            {r.art ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote cover art
              <img src={r.art} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="h-11 w-11 shrink-0 rounded-xl bg-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <p className="truncate text-xs text-white/55">
                {r.artist} · {r.kind}
              </p>
            </div>
            <button
              onClick={() => onPlay(r)}
              aria-label={`Play ${r.title}`}
              className="hand-btn grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-black"
              data-hand-target=""
            >
              {loadingId === r.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <Play size={16} fill="currentColor" />}
            </button>
            <a
              href={r.links.apple ?? r.page ?? r.links.spotify}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${r.title}`}
              className="hand-btn grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white/80"
            >
              <ExternalLink size={15} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
