"use client";

import { useEffect, useRef, useState } from "react";
import type { EngineState } from "./HandOverlay";

type Values = EngineState["values"];

interface Step {
  title: string;
  body: string;
  /** progress 0..1 given the min/max each value reached during this step */
  progress: (s: EngineState, span: Record<keyof Values, number>) => number;
}

const STEPS: Step[] = [
  {
    title: "Show both hands",
    body: "Hold both hands up so the camera can see them, palms facing the screen.",
    progress: (s) => s.hands.length / 2,
  },
  {
    title: "Right hand: pitch",
    body: "Pinch your right thumb and index finger together, then open them wide. The song goes down, then up.",
    progress: (_, span) => span.pitchHz / 150,
  },
  {
    title: "Left hand: speed",
    body: "Now your left thumb and index finger. Close them to slow down, open them to speed up.",
    progress: (_, span) => span.speed / 0.7,
  },
  {
    title: "Spread for volume",
    body: "Move your hands close together, then far apart. Further apart is louder.",
    progress: (_, span) => span.volume / 4,
  },
  {
    title: "Middle fingers: bass & echo",
    body: "Stretch your thumb and middle finger far apart. Left hand adds bass, right hand adds echo.",
    progress: (_, span) => Math.max(span.bass, span.echo) / 0.4,
  },
  {
    title: "Arms: filter & reverb",
    body: "Drop your left hand low to muffle the sound, lift your right hand high for reverb. Resting hands leave the sound alone, and a hand out of view resets its effects.",
    progress: (_, span) => Math.max(span.filter, span.reverb) / 0.5,
  },
];

/** A quick hands-on walkthrough. Each step ticks over once the engine sees you do it. */
export function Onboarding({ state, onDone }: { state: EngineState; onDone: () => void }) {
  const [i, setI] = useState(0);
  const lo = useRef<Partial<Values>>({});
  const hi = useRef<Partial<Values>>({});
  const step = STEPS[i];

  useEffect(() => {
    lo.current = {};
    hi.current = {};
  }, [i]);

  const span = {} as Record<keyof Values, number>;
  for (const k of Object.keys(state.values) as (keyof Values)[]) {
    const v = state.values[k];
    lo.current[k] = Math.min(lo.current[k] ?? v, v);
    hi.current[k] = Math.max(hi.current[k] ?? v, v);
    span[k] = (hi.current[k] ?? v) - (lo.current[k] ?? v);
  }
  const p = Math.max(0, Math.min(1, step.progress(state, span)));
  const done = p >= 1;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => (i + 1 < STEPS.length ? setI(i + 1) : onDone()), 700);
    return () => clearTimeout(t);
  }, [done, i, onDone]);

  return (
    <div className="absolute inset-x-0 bottom-10 flex justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-black/55 p-6 backdrop-blur-md">
        <div className="flex gap-1.5">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full ${k < i ? "bg-white" : k === i ? "bg-white/60" : "bg-white/20"}`} />
          ))}
        </div>
        <p className="mt-4 text-xs font-medium tracking-[0.3em] text-white/60">
          STEP {i + 1} OF {STEPS.length}
        </p>
        <h2 className="mt-1 text-3xl font-light">{done ? "Nice!" : step.title}</h2>
        <p className="mt-2 text-white/80">{step.body}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white transition-[width] duration-150" style={{ width: `${p * 100}%` }} />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onDone} data-hand-target="" className="hand-btn cursor-pointer rounded-full px-5 py-2.5 text-white/70">
            Skip
          </button>
          <button onClick={() => (i + 1 < STEPS.length ? setI(i + 1) : onDone())} data-hand-target="" className="hand-btn cursor-pointer rounded-full bg-white px-6 py-2.5 font-medium text-black">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
