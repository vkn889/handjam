import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App icon: a pinch (two dots and a line) over a waveform. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #1B6CA8, #031C26)", borderRadius: 112 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {[120, 220, 300, 220, 120].map((h, i) => (
            <div key={i} style={{ width: 52, height: h, borderRadius: 26, background: i === 2 ? "#E8FF1F" : "white" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
