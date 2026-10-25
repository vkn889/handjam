/**
 * Generated music. Every track is synthesized in the browser from a short recipe (key, tempo,
 * chords, drum pattern, instrument), so there are no audio files to ship or license.
 * PITCH readouts are relative to A3 (220 Hz).
 */
export const REFERENCE_HZ = 220;

type Wave = "saw" | "square" | "sine" | "pad" | "pluck";

export interface Recipe {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  bars: number;
  /** chords as root frequencies + triad frequencies */
  roots: number[];
  chords: number[][];
  /** 16-step patterns: x = hit */
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  bassWave: Wave;
  padWave: Wave;
  lead?: { wave: Wave; pattern: string; octave: number; fromBar: number };
  palette: [string, string, string];
  pattern: "sunburst" | "rings" | "halftone" | "horizon" | "stripes" | "eclipse" | "mosaic";
}

const Am = [220, 261.63, 329.63], F = [174.61, 220, 261.63], C = [261.63, 329.63, 392], G = [196, 246.94, 293.66];
const Dm = [146.83, 174.61, 220], E = [164.81, 207.65, 246.94], Bb = [233.08, 293.66, 349.23], Em = [164.81, 196, 246.94];

export const RECIPES: Recipe[] = [
  {
    id: "gen-demo", title: "Demo Loop", mood: "Warm A-minor groove", bpm: 100, bars: 8,
    roots: [110, 87.31, 130.81, 98], chords: [Am, F, C, G],
    kick: "x.........x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x.....x.x.....x.",
    bassWave: "saw", padWave: "pad", lead: { wave: "sine", pattern: "x.x.x.x.x.x.x.x.", octave: 2, fromBar: 4 },
    palette: ["#1b1d1f", "#4a52ff", "#c9d6ff"], pattern: "rings",
  },
  {
    id: "gen-neon", title: "Neon Drive", mood: "Synthwave, night highway", bpm: 112, bars: 8,
    roots: [73.42, 116.54, 87.31, 82.41], chords: [Dm, Bb, F, E],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", bass: "x.x.x.x.x.x.x.x.",
    bassWave: "saw", padWave: "saw", lead: { wave: "square", pattern: "x..x..x.x..x..x.", octave: 2, fromBar: 2 },
    palette: ["#140a2e", "#ff3ea5", "#41e0ff"], pattern: "horizon",
  },
  {
    id: "gen-sunny", title: "Sunny Loop", mood: "Bright, bouncy major key", bpm: 96, bars: 8,
    roots: [130.81, 98, 110, 87.31], chords: [C, G, Am, F],
    kick: "x.......x.......", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.x.", bass: "x...x.x.x...x.x.",
    bassWave: "pluck", padWave: "pluck", lead: { wave: "pluck", pattern: "x.x.xx.x.x.x.xx.", octave: 2, fromBar: 0 },
    palette: ["#f0c94c", "#e8572b", "#2b2622"], pattern: "sunburst",
  },
  {
    id: "gen-lofi", title: "Night Bus", mood: "Lo-fi, rainy window", bpm: 78, bars: 8,
    roots: [82.41, 110, 73.42, 98], chords: [Em, Am, Dm, G],
    kick: "x......x..x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.xx", bass: "x.....x...x.....",
    bassWave: "sine", padWave: "pad", lead: { wave: "sine", pattern: "x...x...x.x.....", octave: 1, fromBar: 2 },
    palette: ["#2d3f7a", "#e8b4c8", "#f4efe6"], pattern: "eclipse",
  },
  {
    id: "gen-arcade", title: "Arcade Rush", mood: "Chiptune, fast and silly", bpm: 132, bars: 8,
    roots: [110, 130.81, 98, 87.31], chords: [Am, C, G, F],
    kick: "x...x...x...x...", snare: "....x..x....x...", hat: "xxxxxxxxxxxxxxxx", bass: "x.x.x.x.x.x.x.x.",
    bassWave: "square", padWave: "square", lead: { wave: "square", pattern: "xxx.x.xxx.x.x.x.", octave: 2, fromBar: 0 },
    palette: ["#e9e6df", "#1d1d1d", "#d84b3c"], pattern: "mosaic",
  },
  {
    id: "gen-house", title: "Deep Room", mood: "House, four on the floor", bpm: 122, bars: 8,
    roots: [87.31, 98, 110, 98], chords: [F, G, Am, G],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", bass: ".x.x.x.x.x.x.x.x",
    bassWave: "sine", padWave: "pad", lead: { wave: "pluck", pattern: "..x...x...x..x..", octave: 2, fromBar: 4 },
    palette: ["#d9e3df", "#16443f", "#f08a5d"], pattern: "stripes",
  },
];

const Cm = [261.63, 311.13, 392], Fm = [174.61, 207.65, 261.63], Ab = [207.65, 261.63, 311.13], Gm = [196, 233.08, 293.66];
const Dmaj7 = [146.83, 185, 220], Bm = [246.94, 293.66, 369.99], Gmaj = [196, 246.94, 293.66], A = [220, 277.18, 329.63];

/** Songs you unlock in the market or the season pass. Same synth, new recipes. */
export const PREMIUM_RECIPES: Recipe[] = [
  {
    id: "gen-trap", title: "Trap Bounce", mood: "Rolling hats, deep 808s", bpm: 140, bars: 8,
    roots: [65.41, 87.31, 103.83, 98], chords: [Cm, Fm, Ab, Gm],
    kick: "x......x..x.....", snare: "........x.......", hat: "xxxxx.xxxxxxx.xx", bass: "x......x..x.....",
    bassWave: "sine", padWave: "pad", lead: { wave: "pluck", pattern: "x...x.x...x.x...", octave: 2, fromBar: 2 },
    palette: ["#0d0d12", "#8b5cf6", "#f5f3ff"], pattern: "halftone",
  },
  {
    id: "gen-bossa", title: "Bossa Breeze", mood: "Lazy nylon-string sunshine", bpm: 92, bars: 8,
    roots: [73.42, 123.47, 98, 110], chords: [Dmaj7, Bm, Gmaj, A],
    kick: "x..x....x..x....", snare: "..x..x...x..x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x....x..x....",
    bassWave: "sine", padWave: "pluck", lead: { wave: "pluck", pattern: "x.x..x.x.x..x...", octave: 2, fromBar: 0 },
    palette: ["#f4e7c5", "#2f7d5b", "#e4572e"], pattern: "sunburst",
  },
  {
    id: "gen-dnb", title: "Jungle Rush", mood: "174 BPM drum & bass", bpm: 174, bars: 8,
    roots: [73.42, 116.54, 87.31, 82.41], chords: [Dm, Bb, F, E],
    kick: "x.........x.....", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.x.", bass: "x.x...x.x.x...x.",
    bassWave: "saw", padWave: "pad", lead: { wave: "square", pattern: "x.....x.....x...", octave: 2, fromBar: 4 },
    palette: ["#0b1f14", "#2bd576", "#e8ff1f"], pattern: "stripes",
  },
  {
    id: "gen-cathedral", title: "Synth Cathedral", mood: "Huge slow chords", bpm: 70, bars: 8,
    roots: [110, 87.31, 130.81, 98], chords: [Am, F, C, G],
    kick: "x...............", snare: "........x.......", hat: "................", bass: "x.......x.......",
    bassWave: "sine", padWave: "saw", lead: { wave: "sine", pattern: "x...x...x...x...", octave: 2, fromBar: 2 },
    palette: ["#12091f", "#5b3fa8", "#f1e9ff"], pattern: "rings",
  },
  {
    id: "gen-reggae", title: "Island Skank", mood: "Off-beat chops, dub bass", bpm: 84, bars: 8,
    roots: [98, 130.81, 146.83, 130.81], chords: [Gmaj, C, Dmaj7, C],
    kick: "........x.......", snare: "........x.......", hat: "..x...x...x...x.", bass: "x..x..x...x.x...",
    bassWave: "sine", padWave: "pluck", lead: { wave: "pluck", pattern: "..x...x...x...x.", octave: 1, fromBar: 0 },
    palette: ["#0f5132", "#ffd23f", "#e63946"], pattern: "horizon",
  },
  {
    id: "gen-sparkle", title: "Sparkle Pop", mood: "Bright, bouncy, shiny", bpm: 118, bars: 8,
    roots: [130.81, 98, 110, 87.31], chords: [C, G, Am, F],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x.x.x.x.x.x.x.x.",
    bassWave: "square", padWave: "pluck", lead: { wave: "sine", pattern: "xx.x.xx.x.x.xx.x", octave: 2, fromBar: 0 },
    palette: ["#ffd6ec", "#ff4fa3", "#6b2cff"], pattern: "mosaic",
  },
  {
    id: "gen-anthem", title: "Victory Anthem", mood: "Stadium-sized season reward", bpm: 128, bars: 8,
    roots: [98, 73.42, 82.41, 65.41], chords: [Gmaj, Dmaj7, Em, C],
    kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x.x.x.x.x.x.x.x.",
    bassWave: "saw", padWave: "saw", lead: { wave: "square", pattern: "x.x.x...x.x.x...", octave: 2, fromBar: 2 },
    palette: ["#0f0a00", "#e8b923", "#fff6cf"], pattern: "sunburst",
  },
];

export function renderRecipe(ctx: BaseAudioContext, r: Recipe): AudioBuffer {
  const sr = ctx.sampleRate;
  const step = 60 / r.bpm / 4;
  const total = Math.floor(r.bars * 16 * step * sr);
  const out = new Float32Array(total);
  let seed = r.id.length * 7919 + 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

  const add = (sig: Float32Array, at: number, gain: number) => {
    const i0 = Math.floor(at * sr);
    for (let i = 0; i < sig.length && i0 + i < total; i++) out[i0 + i] += sig[i] * gain;
  };
  const env = (i: number, attack: number, decay: number) => Math.min(1, i / sr / Math.max(attack, 1e-4)) * Math.exp(-i / sr / decay);
  const cache = new Map<string, Float32Array>();
  const note = (freq: number, dur: number, wave: Wave, attack = 0.005, decay = 0.3) => {
    const key = `${freq}|${dur}|${wave}|${attack}|${decay}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const n = Math.floor(dur * sr);
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const ph = freq * t;
      let v = 0;
      if (wave === "saw") for (let k = 1; k < 8; k++) v += Math.sin(2 * Math.PI * ph * k) / k;
      else if (wave === "square") v = (ph % 1 < 0.5 ? 1 : -1) * 0.5;
      else if (wave === "pad") v = (Math.sin(2 * Math.PI * ph * 0.997) + Math.sin(2 * Math.PI * ph) + Math.sin(2 * Math.PI * ph * 1.003)) / 3 + 0.3 * Math.sin(4 * Math.PI * ph);
      else if (wave === "pluck") v = Math.sin(2 * Math.PI * ph) + 0.4 * Math.sin(4 * Math.PI * ph) * Math.exp(-t * 12);
      else v = Math.sin(2 * Math.PI * ph);
      s[i] = v * env(i, attack, decay);
    }
    cache.set(key, s);
    return s;
  };

  const kick = Float32Array.from({ length: Math.floor(0.35 * sr) }, (_, i) => {
    const t = i / sr;
    return Math.sin(2 * Math.PI * (45 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9);
  });
  const snare = Float32Array.from({ length: Math.floor(0.2 * sr) }, (_, i) => rand() * env(i, 0.001, 0.06));
  let last = 0;
  const hat = Float32Array.from({ length: Math.floor(0.06 * sr) }, (_, i) => {
    const v = rand();
    const d = v - last;
    last = v;
    return d * env(i, 0.001, 0.015);
  });

  const padDecay = r.padWave === "pad" ? 2.5 : r.padWave === "pluck" ? 0.35 : 0.9;
  for (let bar = 0; bar < r.bars; bar++) {
    const ci = bar % r.chords.length;
    for (let s = 0; s < 16; s++) {
      const at = (bar * 16 + s) * step;
      if (r.kick[s] === "x") add(kick, at, 0.9);
      if (r.snare[s] === "x") add(snare, at, 0.35);
      if (r.hat[s] === "x") add(hat, at, s % 2 ? 0.18 : 0.1);
      if (r.bass[s] === "x") add(note(r.roots[ci], step * 1.8, r.bassWave, 0.005, 0.18), at, r.bassWave === "square" ? 0.1 : 0.13);
      if (r.lead && bar >= r.lead.fromBar && r.lead.pattern[s] === "x") {
        const f = r.chords[ci][(s + bar) % 3] * r.lead.octave;
        add(note(f, step * 1.6, r.lead.wave, 0.004, 0.12), at, r.lead.wave === "square" ? 0.05 : 0.08);
      }
    }
    if (r.padWave === "pluck") {
      for (const k of [0, 6, 10]) for (const f of r.chords[ci]) add(note(f, step * 4, "pluck", 0.003, padDecay), (bar * 16 + k) * step, 0.05);
    } else {
      for (const f of r.chords[ci]) add(note(f, step * 16, r.padWave, 0.15, padDecay), bar * 16 * step, r.padWave === "saw" ? 0.035 : 0.07);
    }
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.9) for (let i = 0; i < total; i++) out[i] *= 0.9 / peak;

  const buf = ctx.createBuffer(2, total, sr);
  buf.copyToChannel(out, 0);
  buf.copyToChannel(out, 1);
  return buf;
}
