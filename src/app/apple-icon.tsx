import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #1B6CA8, #031C26)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {[42, 78, 106, 78, 42].map((h, i) => (
            <div key={i} style={{ width: 18, height: h, borderRadius: 9, background: i === 2 ? "#E8FF1F" : "white" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
