import type { Track } from "@/lib/library";

/** Cover art for the player: real artwork when we have it, otherwise a generated stripe pattern. */
export function TrackCover({ track }: { track: Track | null }) {
  if (track?.kind === "found" && track.art) {
    // eslint-disable-next-line @next/next/no-img-element -- remote cover art
    return <img src={track.art} alt="" className="h-full w-full object-cover" />;
  }
  const [a, b, c] = track?.kind === "generated" ? track.recipe.palette : ["#1d1f24", "#4a52ff", "#e8ff1f"];
  return (
    <svg viewBox="0 0 280 110" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="280" height="110" fill={a} />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={i * 22 - 10} y="-20" width="9" height="160" fill={i % 3 ? b : c} transform="rotate(24 140 55)" opacity={0.85} />
      ))}
      <circle cx="220" cy="55" r="34" fill={a} opacity="0.85" />
      <circle cx="220" cy="55" r="8" fill={c} />
    </svg>
  );
}
