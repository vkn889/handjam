"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import DiscCascadeCarousel, { type DiscCascadeItem } from "@/components/ui/disc-cascade-carousel";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { onSwipe, player } from "@/lib/engine";
import { allTracks, type Track } from "@/lib/library";

/** Your songs as discs. Swipe your pointing finger sideways to browse, point at "Play this" to pick. */
export function LibraryView({ currentId, onPlayed }: { currentId: string; onPlayed: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void allTracks().then((t) => {
      setTracks(t);
      const at = t.findIndex((x) => x.id === currentId);
      setIndex(at >= 0 ? at : 0);
    });
  }, [currentId]);

  // hand swipes move through the discs
  useEffect(() => onSwipe((dir) => setIndex((i) => Math.max(0, Math.min(tracks.length - 1, i + dir)))), [tracks.length]);

  const items: DiscCascadeItem[] = useMemo(
    () =>
      tracks.map((t) => {
        const base: DiscCascadeItem = {
          title: t.title,
          credits: [
            { label: "Type", value: t.kind === "generated" ? "Generated" : t.kind === "upload" ? "Your upload" : "Found online" },
            { label: t.kind === "generated" ? "Mood" : t.kind === "found" ? "Artist" : "Added", value: t.subtitle },
          ],
        };
        if (t.kind === "generated") return { ...base, palette: t.recipe.palette, pattern: t.recipe.pattern, credits: [...base.credits!, { label: "Tempo", value: t.recipe.bpm + " BPM" }] };
        if (t.kind === "found" && t.art) return { ...base, src: t.art };
        return base;
      }),
    [tracks],
  );

  const pick = async () => {
    const t = tracks[index];
    if (!t) return;
    await player.playTrack(t);
    onPlayed();
  };

  if (!tracks.length) return <div className="absolute inset-0 grid place-items-center text-white/70">Loading your library…</div>;

  return (
    <div className="absolute inset-x-0 bottom-0 top-[76px] z-30">
      <DiscCascadeCarousel
        items={items}
        index={index}
        onIndexChange={setIndex}
        onSelect={() => void pick()}
        height="calc(100vh - 76px)"
        brand=""
        indexLabel=""
        reviews={false}
        hint="Swipe your finger · ← →"
        background="radial-gradient(120% 90% at 50% 40%, rgba(29,29,33,.86), rgba(11,11,13,.94))"
        color="#ecebe7"
        fontHref="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;600;800&family=Oswald:wght@600;700&display=swap"
        ariaLabel="Song library"
        defaultIndex={index}
      />
      <div className="absolute bottom-[12%] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3">
        <LiquidMetalButton viewMode="icon" icon={<ChevronLeft size={18} />} label="Previous song" onClick={() => setIndex((i) => Math.max(0, i - 1))} />
        <LiquidMetalButton label="Play this" width={160} icon={<Play size={15} />} onClick={() => void pick()} />
        <LiquidMetalButton viewMode="icon" icon={<ChevronRight size={18} />} label="Next song" onClick={() => setIndex((i) => Math.min(tracks.length - 1, i + 1))} />
      </div>
    </div>
  );
}
