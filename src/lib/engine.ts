"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { EngineState } from "@/components/HandOverlay";
import { Deck } from "./deck";
import type { Track } from "./library";
import { SessionRecorder, type SessionSummary } from "./session";
import { HandTracker } from "./tracker";

/**
 * Everything runs in the browser: camera + hand tracking (MediaPipe) and the audio deck
 * (Web Audio + an AudioWorklet). Nothing to run separately; the music finder's Python
 * function is the only server code.
 */
interface Engine {
  deck: Deck;
  tracker: HandTracker;
  session: SessionRecorder | null;
  swipeListeners: Set<(dir: -1 | 1) => void>;
}

let engine: Engine | null = null;

function getEngine(): Engine {
  if (!engine) {
    const deck = new Deck();
    const tracker = new HandTracker();
    const e: Engine = { deck, tracker, session: null, swipeListeners: new Set() };
    tracker.onFrame = () => {
      const c = tracker.controls;
      deck.set({
        speed: tracker.speed,
        semitones: tracker.semitones,
        volume: c.spread,
        filter: 1 - tracker.filterAmount,
        reverb: tracker.reverbAmount,
        echo: c.middleR,
        bass: c.middleL,
      });
    };
    tracker.onSwipe = (dir) => e.swipeListeners.forEach((fn) => fn(dir));
    void tracker.start();
    // Closing or leaving the page stops the music and turns the camera off.
    window.addEventListener("pagehide", () => {
      deck.close();
      tracker.stop();
      e.session?.cancel();
      engine = null;
    });
    // Browsers only allow sound after a real click or key press.
    const unlock = () => void deck.resume();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    engine = e;
  }
  return engine;
}

function snapshot(e: Engine): EngineState {
  const { deck, tracker, session } = e;
  deck.sampleLevel();
  const c = tracker.controls;
  return {
    camera: { ok: tracker.ok, width: tracker.width, height: tracker.height, fps: tracker.fps, error: tracker.error, frame: tracker.frame },
    hands: tracker.hands,
    values: {
      speed: Math.round(tracker.speed * 100) / 100,
      pitchHz: Math.round(tracker.hz),
      semitones: Math.round(tracker.semitones * 10) / 10,
      volume: Math.round(c.spread * 100) / 10,
      filter: tracker.filterAmount,
      reverb: tracker.reverbAmount,
      echo: c.middleR,
      bass: c.middleL,
    },
    levels: [...deck.levels],
    track: {
      id: deck.current?.id ?? "",
      title: deck.title,
      playing: deck.playing,
      position: deck.position,
      duration: deck.duration,
      loading: deck.loading,
      shuffle: deck.shuffle,
      repeat: deck.repeat,
      error: deck.error,
    },
    session: session ? { seconds: session.seconds, cognus: session.live() } : null,
  };
}

// ---------------------------------------------------------------- actions

export const player = {
  toggle() {
    const { deck } = getEngine();
    void deck.resume();
    deck.setPlaying(!deck.playing);
  },
  play() {
    const { deck } = getEngine();
    void deck.resume();
    deck.setPlaying(true);
  },
  next: () => void getEngine().deck.next(),
  prev: () => void getEngine().deck.prev(),
  seek: (seconds: number) => getEngine().deck.seek(seconds),
  setShuffle: (on: boolean) => void (getEngine().deck.shuffle = on),
  setRepeat: (on: boolean) => void (getEngine().deck.repeat = on),
  playTrack(t: Track) {
    const { deck } = getEngine();
    void deck.resume();
    return deck.play(t);
  },
  /** Back to how the song really sounds. */
  reset() {
    const e = getEngine();
    e.tracker.reset();
    if (e.session) e.session.resets++;
  },
};

/** Load your own song (MP3, WAV, M4A, OGG, FLAC). Returns an error message, or "". */
export async function uploadSong(file: File): Promise<string> {
  if (file.size > 50 * 1024 * 1024) return "That file is over 50 MB.";
  try {
    const { deck } = getEngine();
    await deck.resume();
    await deck.playFile(file);
    return "";
  } catch {
    return "Couldn't read that audio file. Try an MP3 or WAV.";
  }
}

export function startSession() {
  const e = getEngine();
  e.session?.cancel();
  e.session = new SessionRecorder(() => ({
    controls: e.tracker.controls,
    left: e.tracker.hands.some((h) => h.side === "left"),
    right: e.tracker.hands.some((h) => h.side === "right"),
    title: e.deck.title,
  }));
  player.play();
}

export function endSession(): SessionSummary | null {
  const e = getEngine();
  const s = e.session;
  e.session = null;
  return s ? s.finish() : null;
}

export function onSwipe(fn: (dir: -1 | 1) => void) {
  const e = getEngine();
  e.swipeListeners.add(fn);
  return () => void e.swipeListeners.delete(fn);
}

/** The camera's MediaStream, for showing the feed on screen. */
export function cameraStream() {
  return getEngine().tracker.stream;
}

/**
 * Live engine state at ~30 updates per second, shared by every component through one store.
 * A single timer takes the snapshot; React reads the cached value (no setState loops).
 */
let latest: EngineState | null = null;
const listeners = new Set<() => void>();
let ticker = 0;

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!ticker) {
    const e = getEngine();
    ticker = window.setInterval(() => {
      latest = snapshot(e);
      listeners.forEach((l) => l());
    }, 33);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      window.clearInterval(ticker);
      ticker = 0;
    }
  };
}

export function useEngine() {
  const state = useSyncExternalStore(subscribe, () => latest, () => null);
  return { state, online: true as const };
}

export function useViewport() {
  const [size, setSize] = useState({ w: 1280, h: 720 });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

/** The track that's loaded right now (for cover art and links). */
export function currentTrack() {
  return getEngine().deck.current;
}

/** The hands seen in the latest camera frame (read directly by per-frame UI like the cursor). */
export function trackedHands() {
  return getEngine().tracker.hands;
}
