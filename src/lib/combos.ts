/**
 * Cognus is only earned by landing combos: specific, deliberate gesture patterns.
 *
 *   - Each combo has a base value and a 4 s cooldown.
 *   - Repeating the same combo pays less each time (×0.6 per repeat), so one trick runs dry.
 *   - Landing a *different* combo within 5 s of the last one builds a chain: +25% per link, up to ×2.
 *   - At the end, every distinct combo you landed adds a style bonus.
 *
 * Just waving your hands around earns nothing.
 */

/** What the combo detector sees, ten times a second. */
export interface Levels {
  /** playback rate, 0.5..2 (1 = normal) */
  speed: number;
  /** pitch shift, −12..+12 semitones */
  semi: number;
  /** 0..1 */
  vol: number;
  filter: number;
  reverb: number;
  echo: number;
  bass: number;
}
interface Frame {
  t: number;
  L: Levels;
}

export interface Combo {
  id: string;
  name: string;
  /** how to do it, shown in the combo guide */
  how: string;
  base: number;
  detect: (h: Frame[], now: number) => boolean;
}

const since = (h: Frame[], now: number, s: number) => h.filter((f) => f.t >= now - s);
type Pred = (L: Levels) => boolean;
/** Longest unbroken stretch (seconds) where `pred` held, within the frames given. */
function longest(frames: Frame[], pred: Pred) {
  let run = 0;
  let best = 0;
  for (let i = 1; i < frames.length; i++) {
    run = pred(frames[i].L) && pred(frames[i - 1].L) ? run + (frames[i].t - frames[i - 1].t) : 0;
    best = Math.max(best, run);
  }
  return best;
}
/** The setup was held on purpose: `pred` for at least `hold` seconds, ending before the finish. */
const setUp = (h: Frame[], now: number, window: number, hold: number, pred: Pred) => longest(since(h, now, window).slice(0, -3), pred) >= hold;
/** The finish is real, not one noisy frame: the last three frames (0.3 s) all match. */
const finish = (h: Frame[], pred: Pred) => h.length >= 3 && h.slice(-3).every((f) => pred(f.L));
const loaded = (L: Levels) =>
  [L.speed >= 1.4 || L.speed <= 0.7, Math.abs(L.semi) >= 6, L.filter >= 0.6, L.reverb >= 0.6, L.echo >= 0.6, L.bass >= 0.6, L.vol >= 0.85].filter(Boolean).length;

export const COMBOS: Combo[] = [
  {
    id: "drop",
    name: "Bass Drop",
    how: "Hold your left arm low to muffle the track for half a second, then snap it up while stretching your left middle finger for bass.",
    base: 8,
    detect: (h, now) => finish(h, (L) => L.bass >= 0.6 && L.filter <= 0.15) && setUp(h, now, 1.8, 0.5, (L) => L.filter >= 0.7),
  },
  {
    id: "tape",
    name: "Tape Stop",
    how: "At normal pitch, pinch your left hand shut (half speed) and hold it a moment, then open back to normal speed or faster.",
    base: 6,
    detect: (h, now) =>
      finish(h, (L) => L.speed >= 0.95 && Math.abs(L.semi) < 4) && setUp(h, now, 2.5, 0.3, (L) => L.speed <= 0.6 && Math.abs(L.semi) < 4),
  },
  {
    id: "riser",
    name: "Riser",
    how: "Hold your right pinch low (pitch down 6+ semitones) with your right arm raised for reverb, then sweep it up to +6 or more.",
    base: 10,
    detect: (h, now) => finish(h, (L) => L.semi >= 6 && L.reverb >= 0.5) && setUp(h, now, 2.5, 0.4, (L) => L.semi <= -6 && L.reverb >= 0.5),
  },
  {
    id: "throw",
    name: "Echo Throw",
    how: "With your hands wide, stretch your right middle finger for heavy echo and hold it, then bring your hands together to cut the volume.",
    base: 8,
    detect: (h, now) => finish(h, (L) => L.vol <= 0.25) && setUp(h, now, 1.8, 0.5, (L) => L.echo >= 0.8 && L.vol >= 0.5),
  },
  {
    id: "twin",
    name: "Twin Pinch",
    how: "Pinch both hands shut together (slow and low) and hold, then fling both open wide (fast and high).",
    base: 7,
    detect: (h, now) => finish(h, (L) => L.speed >= 1.6 && L.semi >= 8) && setUp(h, now, 2.5, 0.4, (L) => L.speed <= 0.6 && L.semi <= -8),
  },
  {
    id: "mirror",
    name: "Mirror Flip",
    how: "Hold your left pinch open and right pinch shut (fast but low), then swap them (slow but high).",
    base: 10,
    detect: (h, now) => finish(h, (L) => L.speed <= 0.65 && L.semi >= 6) && setUp(h, now, 2.5, 0.4, (L) => L.speed >= 1.5 && L.semi <= -6),
  },
  {
    id: "wash",
    name: "Wash Out",
    how: "Hold heavy reverb (right arm high) and heavy filter (left arm low) together for a second and a half, then drop both arms to neutral at once.",
    base: 9,
    detect: (h, now) => finish(h, (L) => L.reverb <= 0.1 && L.filter <= 0.1) && setUp(h, now, 3.5, 1.5, (L) => L.reverb >= 0.75 && L.filter >= 0.6),
  },
  {
    id: "wobble",
    name: "Wobble",
    how: "Flex your left middle finger in and out for three full bass pumps inside three seconds, everything else steady.",
    base: 6,
    detect: (h, now) => {
      const w = since(h, now, 3);
      // the other controls stay put, so it's a wobble and not flailing
      if (w.some((f) => Math.abs(f.L.semi) > 4 || f.L.speed < 0.8 || f.L.speed > 1.25)) return false;
      let state = 0;
      let flips = 0;
      for (const f of w) {
        const s = f.L.bass >= 0.7 ? 1 : f.L.bass <= 0.3 ? -1 : 0;
        if (s && s !== state) {
          if (state) flips++;
          state = s;
        }
      }
      return flips >= 6;
    },
  },
  {
    id: "stack",
    name: "Full Stack",
    how: "Push five effects hard at the same time (speed, pitch, filter, reverb, echo, bass or full volume) and hold it for a full second.",
    base: 20,
    detect: (h, now) => longest(since(h, now, 1.2), (L) => loaded(L) >= 5) >= 1,
  },
];

export const comboById = (id: string) => COMBOS.find((c) => c.id === id);

const COOLDOWN = 4;
const CHAIN_WINDOW = 5;
const REPEAT_DECAY = 0.6;
export const STYLE_PER_COMBO = 3;

export interface ComboHit {
  id: string;
  name: string;
  points: number;
  mult: number;
  /** session seconds */
  at: number;
}

export class ComboTracker {
  private h: Frame[] = [];
  private cool: Record<string, number> = {};
  /** a combo must stop matching (be released) before it can fire again */
  private armed: Record<string, boolean> = {};
  counts: Record<string, number> = {};
  points = 0;
  chain = 0;
  bestChain = 0;
  last: ComboHit | null = null;

  feed(L: Levels, t: number) {
    this.h.push({ t, L });
    while (this.h.length && this.h[0].t < t - 4) this.h.shift();
    for (const c of COMBOS) {
      const hit = c.detect(this.h, t);
      if (!hit) this.armed[c.id] = true;
      if (!hit || this.armed[c.id] === false || (this.cool[c.id] ?? -Infinity) > t) continue;
      this.cool[c.id] = t + COOLDOWN;
      this.armed[c.id] = false;
      const linked = this.last && this.last.id !== c.id && t - this.last.at <= CHAIN_WINDOW;
      this.chain = linked ? this.chain + 1 : 0;
      this.bestChain = Math.max(this.bestChain, this.chain);
      const mult = Math.min(2, 1 + 0.25 * this.chain);
      const n = this.counts[c.id] ?? 0;
      const points = Math.floor(c.base * Math.pow(REPEAT_DECAY, n) * mult);
      this.counts[c.id] = n + 1;
      this.points += points;
      this.last = { id: c.id, name: c.name, points, mult, at: t };
    }
  }

  /** Distinct combos landed × STYLE_PER_COMBO. */
  get style() {
    return Object.keys(this.counts).length * STYLE_PER_COMBO;
  }
  get total() {
    return this.points + this.style;
  }
}
