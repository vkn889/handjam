"use client";

import { useEffect, useState } from "react";
import popular from "@/data/popular-albums.json";
import { TiltedGridHero, type TiltedGridImage } from "@/components/ui/tilted-grid-hero";
import { WavesShader } from "@/components/ui/waves-shader";
import { mostPlayed } from "@/lib/library";

/**
 * The landing screen: the Waves shader behind a curved row of album covers. The row mixes
 * the songs you play most in HandJam with some of the most popular albums in the world.
 */
export function Home({ songTitle }: { songTitle: string }) {
  const famous = popular as TiltedGridImage[];
  const [images, setImages] = useState<TiltedGridImage[]>(famous);
  // Play history lives in this browser, so it's read after mount (the server render has none).
  useEffect(() => {
    const yours = mostPlayed(8);
    if (!yours.length) return;
    // Interleave so your music shows up early and often between the classics.
    const out: TiltedGridImage[] = [];
    for (let i = 0; i < Math.max(yours.length * 2, famous.length); i++) {
      if (yours.length && i % 2 === 0) out.push(yours[(i / 2) % yours.length]);
      else if (famous.length) out.push(famous[i % famous.length]);
    }
    setImages(out);
  }, [famous]);

  return (
    <div className="absolute inset-0">
      <WavesShader />
      <TiltedGridHero images={images} aspectRatio={1} tileHeight={30} axis={68} gap={8} speed={3.5} fade={10} className="absolute inset-0">
        <div className="relative z-10 flex h-full flex-col items-center px-6 pt-[17vh] text-center">
          <p className="hud-text text-sm font-medium tracking-[0.35em] text-white/80">REMIX WITH YOUR HANDS</p>
          <h1 className="hud-text mt-3 text-7xl font-light tracking-tight sm:text-8xl">HandJam</h1>
          <p className="hud-text mt-5 max-w-xl text-lg text-white/90">
            Pinch to bend pitch and speed, stretch your middle fingers for bass and echo, spread your hands for volume.
          </p>
          <p className="hud-text mt-3 text-sm text-white/75">Now loaded: {songTitle || "Demo Loop"}</p>
          <p className="hud-text absolute bottom-6 text-sm text-white/80">Point your index finger at a button and hold still for a second to pick it.</p>
        </div>
      </TiltedGridHero>
    </div>
  );
}
