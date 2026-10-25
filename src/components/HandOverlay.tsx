import type { ComboHit } from "@/lib/combos";

type Pt = [number, number];

export interface EngineState {
  camera: { ok: boolean; width: number; height: number; fps: number; error: string; frame: number };
  hands: { side: "left" | "right"; thumb: Pt; index: Pt; middle: Pt; wrist: Pt; pinch: number; pts: Pt[] }[];
  values: { speed: number; pitchHz: number; semitones: number; volume: number; filter: number; reverb: number; echo: number; bass: number };
  levels: number[];
  track: { id: string; title: string; playing: boolean; position: number; duration: number; loading: boolean; shuffle: boolean; repeat: boolean; error: string };
  session: { seconds: number; cognus: number; chain: number; last: ComboHit | null } | null;
}

/**
 * Minimal white HUD drawn over the mirrored camera feed:
 * a pinch "slider" on each hand, a dashed link between them carrying the waveform,
 * and the volume readout up top.
 */
export function HandOverlay({
  state,
  width,
  height,
  theme,
}: {
  state: EngineState;
  width: number;
  height: number;
  /** HUD colours from the equipped theme: [lines, waveform, -, dark track] */
  theme?: readonly string[];
}) {
  const { camera, hands, values, levels } = state;
  // match the <img object-cover> fit
  const s = Math.max(width / camera.width, height / camera.height);
  const ox = (width - camera.width * s) / 2;
  const oy = (height - camera.height * s) / 2;
  const P = (p: Pt): Pt => [ox + p[0] * camera.width * s, oy + p[1] * camera.height * s];

  const left = hands.find((h) => h.side === "left");
  const right = hands.find((h) => h.side === "right");
  const mid = (h: (typeof hands)[number]) => {
    const a = P(h.thumb);
    const b = P(h.index);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Pt;
  };
  const lm = left && mid(left);
  const rm = right && mid(right);
  const unit = Math.max(1, Math.min(width, height) / 720);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      style={theme ? ({ "--hud": theme[0], "--wave": theme[1], "--hud-track": theme[3] } as React.CSSProperties) : undefined}
    >
      {/* link + waveform between the two hands */}
      {lm && rm && <Link a={lm} b={rm} levels={levels} unit={unit} />}

      {left && <Middle hand={left} P={P} label="BASS" value={values.bass} unit={unit} />}
      {right && <Middle hand={right} P={P} label="ECHO" value={values.echo} unit={unit} />}
      {left && <Pinch hand={left} P={P} label="SPEED" value={`${values.speed.toFixed(1)}x`} unit={unit} />}
      {right && <Pinch hand={right} P={P} label="PITCH" value={`${values.pitchHz}Hz`} unit={unit} />}

      {/* volume, top centre */}
      <g transform={`translate(${width / 2} ${height * 0.17})`} className="hud-text">
        <text textAnchor="middle" fill="var(--hud)" fontSize={20 * unit} fontWeight={500} letterSpacing={1}>
          VOLUME
        </text>
        <text textAnchor="middle" y={44 * unit} fill="var(--hud)" fontSize={34 * unit} fontWeight={300}>
          {values.volume.toFixed(1)}
        </text>
      </g>
      <g transform={`translate(${width / 2 - 100 * unit} ${height * 0.42})`}>
        <rect width={200 * unit} height={14 * unit} fill="var(--hud-track)" opacity={0.92} />
        <rect width={200 * unit * (values.volume / 10)} height={14 * unit} fill="var(--hud)" />
      </g>

      {/* arm height extras: left arm = filter, right arm = reverb */}
      <SideMeter x={28 * unit} height={height} unit={unit} value={values.filter} label="FILTER" align="start" />
      <SideMeter x={width - 28 * unit} height={height} unit={unit} value={values.reverb} label="REVERB" align="end" />
    </svg>
  );
}

function Pinch({ hand, P, label, value, unit }: { hand: EngineState["hands"][number]; P: (p: Pt) => Pt; label: string; value: string; unit: number }) {
  const a = P(hand.thumb);
  const b = P(hand.index);
  const lower = a[1] > b[1] ? a : b;
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--hud)" strokeWidth={3 * unit} strokeLinecap="round" />
      {[a, b].map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={17 * unit} fill="none" stroke="var(--hud)" strokeWidth={2.5 * unit} />
          <circle cx={p[0]} cy={p[1]} r={10 * unit} fill="rgba(255,255,255,0.35)" stroke="var(--hud)" strokeWidth={2.5 * unit} />
        </g>
      ))}
      <circle cx={m[0]} cy={m[1]} r={5 * unit} fill="var(--hud)" />
      <g transform={`translate(${lower[0] - 50 * unit} ${lower[1] + 48 * unit})`} className="hud-text">
        <text fill="var(--hud)" fontSize={20 * unit} fontWeight={500} letterSpacing={1}>
          {label}
        </text>
        <text y={40 * unit} fill="var(--hud)" fontSize={32 * unit} fontWeight={300}>
          {value}
        </text>
      </g>
    </g>
  );
}

/** Thumb → middle finger: a thinner dashed line with its own readout. */
function Middle({ hand, P, label, value, unit }: { hand: EngineState["hands"][number]; P: (p: Pt) => Pt; label: string; value: number; unit: number }) {
  const a = P(hand.thumb);
  const b = P(hand.middle);
  const outward = hand.side === "left" ? -1 : 1;
  return (
    <g opacity={0.55 + value * 0.45}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--hud)" strokeWidth={1.6 * unit} strokeDasharray={`${3 * unit} ${4 * unit}`} />
      <circle cx={b[0]} cy={b[1]} r={8 * unit} fill="none" stroke="var(--hud)" strokeWidth={2 * unit} />
      <g transform={`translate(${b[0] + outward * 22 * unit} ${b[1] - 6 * unit})`} className="hud-text">
        <text textAnchor={outward < 0 ? "end" : "start"} fill="var(--hud)" fontSize={13 * unit} fontWeight={500} letterSpacing={1}>
          {label}
        </text>
        <text y={20 * unit} textAnchor={outward < 0 ? "end" : "start"} fill="var(--hud)" fontSize={18 * unit} fontWeight={300}>
          {Math.round(value * 100)}%
        </text>
      </g>
    </g>
  );
}

function Link({ a, b, levels, unit }: { a: Pt; b: Pt; levels: number[]; unit: number }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular, for the bar heights
  const nx = -uy;
  const ny = ux;
  const bars = levels.slice(-16).reverse(); // newest next to the left hand
  const spacing = Math.min(15 * unit, (len * 0.3) / Math.max(1, bars.length));
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#111" strokeOpacity={0.8} strokeWidth={2 * unit} strokeDasharray={`${6 * unit} ${5 * unit}`} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--hud)" strokeOpacity={0.5} strokeWidth={1 * unit} strokeDasharray={`${6 * unit} ${5 * unit}`} strokeDashoffset={5 * unit} />
      {bars.map((v, i) => {
        const d = 22 * unit + i * spacing;
        const cx = a[0] + ux * d;
        const cy = a[1] + uy * d;
        const h = Math.max(2 * unit, v * 110 * unit);
        const fade = 1 - i / bars.length;
        return (
          <line
            key={i}
            x1={cx - nx * h}
            y1={cy - ny * h}
            x2={cx + nx * h}
            y2={cy + ny * h}
            stroke="var(--wave)"
            strokeOpacity={0.35 + 0.65 * fade}
            strokeWidth={6 * unit}
          />
        );
      })}
    </g>
  );
}

function SideMeter({ x, height, unit, value, label, align }: { x: number; height: number; unit: number; value: number; label: string; align: "start" | "end" }) {
  const top = height * 0.55;
  const h = height * 0.28;
  return (
    <g className="hud-text" opacity={0.85}>
      <rect x={x - 3 * unit} y={top} width={6 * unit} height={h} rx={3 * unit} fill="var(--hud)" fillOpacity={0.2} />
      <rect x={x - 3 * unit} y={top + h * (1 - value)} width={6 * unit} height={h * value} rx={3 * unit} fill="var(--hud)" />
      <text x={x} y={top + h + 26 * unit} textAnchor={align} fill="var(--hud)" fontSize={13 * unit} fontWeight={500} letterSpacing={1}>
        {label}
      </text>
      <text x={x} y={top + h + 44 * unit} textAnchor={align} fill="var(--hud)" fillOpacity={0.75} fontSize={12 * unit}>
        {label === "FILTER" ? "lower left arm" : "raise right arm"}
      </text>
    </g>
  );
}
