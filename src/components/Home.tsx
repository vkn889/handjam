"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import heroSets from "@/data/hero-sets.json";
import popular from "@/data/popular-albums.json";
import { TiltedGridHero, type TiltedGridImage } from "@/components/ui/tilted-grid-hero";
import { WavesShader } from "@/components/ui/waves-shader";
import { useAccount } from "@/lib/account";
import { itemById } from "@/lib/catalog";
import { mostPlayed } from "@/lib/library";

const SETS: Record<string, TiltedGridImage[]> = { "hero-popular": popular as TiltedGridImage[], ...(heroSets as Record<string, TiltedGridImage[]>) };

/**
 * The landing screen: the Waves shader behind a curved row of album covers. Which wallpaper,
 * which covers and how the row moves are yours to customise in the Market.
 */
export function Home({ songTitle }: { songTitle: string }) {
  const { profile } = useAccount();
  const { hero, equipped } = profile;
  const set = equipped.heroSet;
  const base = SETS[set] ?? SETS["hero-popular"];
  const [images, setImages] = useState<TiltedGridImage[]>(base);

  // Play history lives in this browser, so it's read after mount (the server render has none).
  useEffect(() => {
    const yours = hero.includeMine || set === "hero-mine" ? mostPlayed(set === "hero-mine" ? 16 : 8) : [];
    if (set === "hero-mine") {
      setImages(yours.length ? yours : SETS["hero-popular"]);
      return;
    }
    if (!yours.length) {
      setImages(base);
      return;
    }
    // Interleave so your music shows up early and often between the classics.
    const out: TiltedGridImage[] = [];
    for (let i = 0; i < Math.max(yours.length * 2, base.length); i++) {
      if (i % 2 === 0) out.push(yours[(i / 2) % yours.length]);
      else out.push(base[i % base.length]);
    }
    setImages(out);
  }, [base, set, hero.includeMine]);

  return (
    <div className="absolute inset-0">
      <WavesShader colors={itemById(equipped.wallpaper)?.colors} />
      <TiltedGridHero
        images={images}
        aspectRatio={1}
        tileHeight={hero.tileHeight}
        curve={hero.curve}
        axis={68}
        gap={8}
        speed={hero.speed}
        fade={10}
        className="absolute inset-0"
      >
        <div className="relative z-10 flex h-full flex-col items-center px-6 pt-[17vh] text-center">
          <p className="hud-text text-sm font-medium tracking-[0.35em] text-white/80">REMIX WITH YOUR HANDS</p>
          <h1 className="hud-text mt-3 text-7xl font-light tracking-tight sm:text-8xl">HandJam</h1>
          <p className="hud-text mt-5 max-w-xl text-lg text-white/90">
            Pinch to bend pitch and speed, stretch your middle fingers for bass and echo, spread your hands for volume.
          </p>
          <p className="hud-text mt-3 text-sm text-white/75">Now loaded: {songTitle || "Demo Loop"}</p>
          <p className="hud-text absolute bottom-12 text-sm text-white/80">Point your index finger at a button and hold still for a second to pick it.</p>
          <nav aria-label="Guides" className="hud-text absolute bottom-4 flex gap-5 text-xs text-white/70">
            <Link href="/how-to-play" className="hover:text-white">How to play</Link>
            <Link href="/combos" className="hover:text-white">Combo guide</Link>
          </nav>
        </div>
      </TiltedGridHero>
    </div>
  );
}
