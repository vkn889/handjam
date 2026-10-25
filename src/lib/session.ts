"use client";

import { ComboTracker, type ComboHit, type Levels } from "./combos";
import type { Controls } from "./tracker";

/**
 * Jam sessions and Cognus.
 *
 * While a session runs we sample every control ten times a second. Cognus is earned only by
 * landing combos (see combos.ts): specific gesture patterns, worth less each time you repeat
 * one and more when you chain different ones. The rest (moves, hand activity, songs) is
 * recorded for the stats screen but doesn't pay.
 */
export const CONTROL_KEYS = ["speed", "pitch", "volume", "filter", "reverb", "echo", "bass"] as const;
export type ControlKey = (typeof CONTROL_KEYS)[number];
export const CONTROL_LABEL: Record<ControlKey, string> = {
  speed: "Speed", pitch: "Pitch", volume: "Volume", filter: "Filter", reverb: "Reverb", echo: "Echo", bass: "Bass",
};
export const CONTROL_HAND: Record<ControlKey, "left" | "right" | "both"> = {
  speed: "left", filter: "left", bass: "left", pitch: "right", reverb: "right", echo: "right", volume: "both",
};

const fromControls = (c: Controls): number[] => [c.pinchL, c.pinchR, c.spread, c.heightL, c.heightR, c.middleR, c.middleL];

export interface Breakdown {
  /** points from combos, after repeat decay and chain multipliers */
  combos: number;
  /** distinct combos × 3 */
  style: number;
}

export interface SessionSummary {
  id: string;
  startedAt: number;
  seconds: number;
  cognus: number;
  breakdown: Breakdown;
  /** how many times each combo landed */
  combos: Record<string, number>;
  bestChain: number;
  moves: Record<ControlKey, number>;
  songs: { title: string; seconds: number; curve: number[] }[];
  /** up to 60 evenly spaced samples of the seven controls, 0..1 */
  timeline: number[][];
  /** left / right hand activity in 6 equal slices of the session */
  handFlow: { left: number[]; right: number[] };
}

interface Sample {
  t: number;
  v: number[];
  left: boolean;
  right: boolean;
}

export class SessionRecorder {
  startedAt = Date.now();
  private samples: Sample[] = [];
  private songs: { title: string; start: number }[] = [];
  private songSwitches = 0;
  resets = 0;
  swipes = 0;
  private timer = 0;
  readonly combos = new ComboTracker();

  constructor(private read: () => { controls: Controls; levels: Levels; left: boolean; right: boolean; title: string }) {
    const first = read();
    this.songs.push({ title: first.title, start: 0 });
    this.timer = window.setInterval(() => this.tick(), 100);
  }

  get seconds() {
    return (Date.now() - this.startedAt) / 1000;
  }

  private tick() {
    const s = this.read();
    const t = this.seconds;
    this.samples.push({ t, v: fromControls(s.controls), left: s.left, right: s.right });
    this.combos.feed(s.levels, t);
    const cur = this.songs[this.songs.length - 1];
    if (s.title && cur.title !== s.title) {
      this.songs.push({ title: s.title, start: t });
      this.songSwitches++;
    }
  }

  /** Score so far: shown live during the session. */
  live(): { cognus: number; chain: number; last: ComboHit | null } {
    return { cognus: this.combos.total, chain: this.combos.chain, last: this.combos.last };
  }

  finish(): SessionSummary {
    window.clearInterval(this.timer);
    const moves = countMoves(this.samples);
    const breakdown: Breakdown = { combos: this.combos.points, style: this.combos.style };
    const cognus = this.combos.total;
    const n = this.samples.length;
    const pick = (k: number) => this.samples[Math.min(n - 1, Math.floor((k / 59) * (n - 1)))];
    const timeline = n ? Array.from({ length: Math.min(60, n) }, (_, k) => pick(k).v.map((x) => Math.round(x * 1000) / 1000)) : [];
    const slices = 6;
    const handFlow = { left: new Array(slices).fill(0), right: new Array(slices).fill(0) };
    for (let i = 1; i < n; i++) {
      const sl = Math.min(slices - 1, Math.floor((i / n) * slices));
      const d = this.samples[i].v.map((x, k) => Math.abs(x - this.samples[i - 1].v[k]));
      handFlow.left[sl] += d[0] + d[3] + d[6];
      handFlow.right[sl] += d[1] + d[4] + d[5];
    }
    const end = this.seconds;
    const songs = this.songs.map((s, i) => {
      const until = this.songs[i + 1]?.start ?? end;
      const inSong = this.samples.filter((x) => x.t >= s.start && x.t < until);
      const curve = Array.from({ length: 7 }, (_, k) => {
        const x = inSong[Math.floor((k / 6) * Math.max(0, inSong.length - 1))];
        return x ? Math.round((x.v[0] + x.v[1] + x.v[2]) * 333) / 1000 : 0.5;
      });
      return { title: s.title, seconds: Math.round(until - s.start), curve };
    });
    const summary: SessionSummary = {
      id: "s-" + this.startedAt.toString(36),
      startedAt: this.startedAt,
      seconds: Math.round(end),
      cognus,
      breakdown,
      combos: { ...this.combos.counts },
      bestChain: this.combos.bestChain,
      moves,
      songs,
      timeline,
      handFlow: { left: handFlow.left.map((x) => Math.round(x * 100) / 100), right: handFlow.right.map((x) => Math.round(x * 100) / 100) },
    };
    saveSession(summary);
    return summary;
  }

  cancel() {
    window.clearInterval(this.timer);
  }
}

/** A "move" = a control travelled 0.15 from where it last settled (for the stats screen). */
function countMoves(samples: Sample[]) {
  const k = CONTROL_KEYS.length;
  const moves = Object.fromEntries(CONTROL_KEYS.map((c) => [c, 0])) as Record<ControlKey, number>;
  const anchor = samples[0]?.v.slice() ?? new Array(k).fill(0);
  for (let i = 1; i < samples.length; i++) {
    for (let c = 0; c < k; c++) {
      if (Math.abs(samples[i].v[c] - anchor[c]) > 0.15) {
        moves[CONTROL_KEYS[c]]++;
        anchor[c] = samples[i].v[c];
      }
    }
  }
  return moves;
}

const KEY = "handjam-sessions";

export function listSessions(): SessionSummary[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSession(s: SessionSummary) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...listSessions(), s].slice(-40)));
  } catch {
    /* storage full: the summary still shows on screen */
  }
}

export const totalCognus = () => listSessions().reduce((a, s) => a + s.cognus, 0);
