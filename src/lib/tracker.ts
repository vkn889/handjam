"use client";

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { REFERENCE_HZ } from "./tracks";

/**
 * Webcam → MediaPipe hands → remix controls, all in the browser.
 *
 *   Right thumb–index      → PITCH  (110–440 Hz, ±12 semitones)
 *   Left thumb–index       → SPEED  (0.5x–2x)
 *   Right thumb–middle     → ECHO   (stretch them apart for more)
 *   Left thumb–middle      → BASS   (stretch them apart for more)
 *   Hands apart            → VOLUME (0–10)
 *   Left arm lowered       → FILTER (the lower, the more muffled)
 *   Right arm raised       → REVERB (the higher, the bigger the room)
 *
 * Distances are divided by hand size, so moving closer to the camera doesn't change values.
 * Values are EMA-smoothed. When a hand leaves the frame, its settings ease back to normal.
 */
type Pt = [number, number];
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const SMOOTH = 0.35;
const RELEASE = 0.12; // how fast a missing hand's settings drift home

const remap = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

/** What "normal" sounds like. Reset and absent hands return here. */
export const DEFAULTS = { pinchL: 0.5, pinchR: 0.5, middleL: 0, middleR: 0, spread: 0.55, heightL: 1, heightR: 0 };
export type Controls = typeof DEFAULTS;

export interface TrackedHand {
  side: "left" | "right";
  thumb: Pt;
  index: Pt;
  middle: Pt;
  wrist: Pt;
  pinch: number;
}

export class HandTracker {
  video: HTMLVideoElement;
  stream: MediaStream | null = null;
  ok = false;
  error = "";
  width = 1280;
  height = 720;
  fps = 0;
  frame = 0;
  hands: TrackedHand[] = [];
  controls: Controls = { ...DEFAULTS };
  onFrame?: () => void;
  onSwipe?: (dir: -1 | 1) => void;
  private landmarker: HandLandmarker | null = null;
  private stopped = false;
  private lastTs = 0;
  private frameTimes: number[] = [];
  private tipHistory: { t: number; x: number }[] = [];
  private lastSwipe = 0;
  private holdUntil = 0;

  constructor() {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
  }

  get speed() {
    return 0.5 * Math.pow(4, this.controls.pinchL);
  }
  get semitones() {
    return (this.controls.pinchR * 2 - 1) * 12;
  }
  get hz() {
    return REFERENCE_HZ * Math.pow(2, this.semitones / 12);
  }
  /**
   * How muffled the song is, 0..1. Only a deliberately lowered left arm counts: a hand resting
   * anywhere in the top two-thirds of the frame leaves the sound untouched.
   */
  get filterAmount() {
    return remap(this.controls.heightL, 0.4, 0.05);
  }
  /** Reverb amount, 0..1. Only a raised right arm (upper part of the frame) adds it. */
  get reverbAmount() {
    return remap(this.controls.heightR, 0.55, 0.95);
  }

  /** Back to normal, and hold there briefly so the hand you used to press Reset doesn't undo it. */
  reset() {
    this.controls = { ...DEFAULTS };
    this.holdUntil = performance.now() + 1500;
  }

  async start() {
    try {
      this.stream = await openBuiltInCamera();
      this.video.srcObject = this.stream;
      await this.video.play();
      this.width = this.video.videoWidth || 1280;
      this.height = this.video.videoHeight || 720;
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const make = (delegate: "GPU" | "CPU") =>
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        this.landmarker = await make("GPU");
      } catch {
        this.landmarker = await make("CPU");
      }
      this.ok = true;
      this.loop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error = /denied|NotAllowed|Permission/i.test(msg) ? "Camera access was blocked. Allow it in the browser's address bar, then reload." : msg;
    }
  }

  stop() {
    this.stopped = true;
    this.ok = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.landmarker?.close();
  }

  private loop = () => {
    if (this.stopped) return;
    const v = this.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    try {
      this.process();
    } catch (e) {
      console.warn("[HandJam] tracking frame failed", e);
    }
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(this.loop);
    else requestAnimationFrame(this.loop);
  };

  private process() {
    if (!this.landmarker || this.video.readyState < 2) return;
    let ts = performance.now();
    if (ts <= this.lastTs) ts = this.lastTs + 0.01;
    this.lastTs = ts;
    const res = this.landmarker.detectForVideo(this.video, ts);
    const aspect = this.width / this.height;

    const hands = res.landmarks.map((lm, i) => {
      // Mirror into "selfie" space so your right hand shows on the right of the screen.
      const pts: Pt[] = lm.map((p) => [1 - p.x, p.y]);
      // MediaPipe's label already matches the player's real hand here (checked live).
      const label = res.handedness[i]?.[0]?.categoryName;
      const side: "left" | "right" = label === "Left" ? "left" : "right";
      return { side, pts };
    });
    if (hands.length === 2 && hands[0].side === hands[1].side) {
      hands.sort((a, b) => a.pts[WRIST][0] - b.pts[WRIST][0]);
      hands[0].side = "left";
      hands[1].side = "right";
    }

    const c = this.controls;
    const ema = (prev: number, next: number, k = SMOOTH) => prev + (next - prev) * k;
    const L = hands.find((h) => h.side === "left");
    const R = hands.find((h) => h.side === "right");
    const size = (p: Pt[]) => Math.max(1e-4, dist(p[WRIST], p[MIDDLE_MCP], aspect));
    const pinch = (p: Pt[]) => remap(dist(p[THUMB_TIP], p[INDEX_TIP], aspect) / size(p), 0.2, 1.35);
    // A relaxed hand already has thumb and middle ~1 hand-size apart, so only a deliberate stretch counts.
    const middle = (p: Pt[]) => remap(dist(p[THUMB_TIP], p[MIDDLE_TIP], aspect) / size(p), 1.0, 1.8);
    const height = (p: Pt[]) => remap(1 - p[WRIST][1], 0.1, 0.85);

    const held = ts < this.holdUntil;
    if (held) {
      // just reset: keep the song sounding normal for a moment
    } else if (L) {
      c.pinchL = ema(c.pinchL, pinch(L.pts));
      c.middleL = ema(c.middleL, middle(L.pts));
      c.heightL = ema(c.heightL, height(L.pts));
    } else {
      c.pinchL = ema(c.pinchL, DEFAULTS.pinchL, RELEASE);
      c.middleL = ema(c.middleL, DEFAULTS.middleL, RELEASE);
      c.heightL = ema(c.heightL, DEFAULTS.heightL, RELEASE);
    }
    if (held) {
      // see above
    } else if (R) {
      c.pinchR = ema(c.pinchR, pinch(R.pts));
      c.middleR = ema(c.middleR, middle(R.pts));
      c.heightR = ema(c.heightR, height(R.pts));
    } else {
      c.pinchR = ema(c.pinchR, DEFAULTS.pinchR, RELEASE);
      c.middleR = ema(c.middleR, DEFAULTS.middleR, RELEASE);
      c.heightR = ema(c.heightR, DEFAULTS.heightR, RELEASE);
    }
    if (held) {
      // see above
    } else if (L && R) c.spread = ema(c.spread, remap(dist(L.pts[WRIST], R.pts[WRIST], aspect), 0.15, 1.15));
    else c.spread = ema(c.spread, DEFAULTS.spread, RELEASE);

    // Swipe: the pointing fingertip whips sideways quickly (used to flick through the library).
    const pointer = R ?? L;
    if (pointer) {
      this.tipHistory.push({ t: ts, x: pointer.pts[INDEX_TIP][0] });
      while (this.tipHistory.length && ts - this.tipHistory[0].t > 220) this.tipHistory.shift();
      const first = this.tipHistory[0];
      const dx = pointer.pts[INDEX_TIP][0] - first.x;
      if (Math.abs(dx) > 0.22 && ts - first.t > 60 && ts - this.lastSwipe > 650) {
        this.lastSwipe = ts;
        this.tipHistory = [];
        this.onSwipe?.(dx > 0 ? 1 : -1);
      }
    } else this.tipHistory = [];

    this.hands = hands.map(({ side, pts }) => ({
      side,
      thumb: pts[THUMB_TIP],
      index: pts[INDEX_TIP],
      middle: pts[MIDDLE_TIP],
      wrist: pts[WRIST],
      pinch: pinch(pts),
    }));
    this.frame++;
    this.frameTimes.push(ts);
    while (this.frameTimes.length && ts - this.frameTimes[0] > 1000) this.frameTimes.shift();
    this.fps = this.frameTimes.length;
    this.onFrame?.();
  }
}

function dist(a: Pt, b: Pt, aspect: number) {
  return Math.hypot((a[0] - b[0]) * aspect, a[1] - b[1]);
}

/**
 * Prefer the computer's own camera over an iPhone attached through Continuity Camera.
 * Device names are only visible after permission, so ask once, then switch if needed.
 */
async function openBuiltInCamera(): Promise<MediaStream> {
  const constraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
  let stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
  const isPhone = (label: string) => /iphone|continuity|desk view/i.test(label);
  const builtIn = devices.find((d) => /facetime|built-in|macbook|integrated/i.test(d.label) && !isPhone(d.label)) ?? devices.find((d) => !isPhone(d.label));
  const current = stream.getVideoTracks()[0]?.getSettings().deviceId;
  if (builtIn && builtIn.deviceId && builtIn.deviceId !== current) {
    stream.getTracks().forEach((t) => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({ video: { ...constraints, deviceId: { exact: builtIn.deviceId } }, audio: false });
  }
  return stream;
}
