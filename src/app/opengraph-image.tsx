import { ImageResponse } from "next/og";

export const alt = "HandJam: remix music with your hands using your webcam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when HandJam is shared (and in some search results). */
export default function Image() {
  const bars = Array.from({ length: 40 }, (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 0.55)) * 110));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(120% 120% at 50% 110%, #5AD2F4 0%, #1B6CA8 35%, #031C26 75%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 10, opacity: 0.85 }}>REMIX WITH YOUR HANDS</div>
        <div style={{ fontSize: 150, fontWeight: 300, letterSpacing: -4, marginTop: 6 }}>HandJam</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 24, height: 150 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ width: 12, height: h, borderRadius: 6, background: i % 7 === 3 ? "#E8FF1F" : "rgba(255,255,255,0.9)" }} />
          ))}
        </div>
        <div style={{ fontSize: 30, marginTop: 28, opacity: 0.9 }}>Free hand-tracking DJ game · just your webcam · battle friends online</div>
      </div>
    ),
    size,
  );
}
