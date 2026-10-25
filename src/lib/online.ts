"use client";

import { useSyncExternalStore } from "react";
import { signInAnonymously } from "firebase/auth";
import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Unsubscribe,
} from "firebase/database";
import { getAccount } from "./account";
import { itemById } from "./catalog";
import { fb } from "./firebase";
import type { Track } from "./library";
import { PREMIUM_RECIPES, RECIPES } from "./tracks";

/**
 * Online battles. Up to six players join a room with a short code, the host picks a song,
 * everyone starts at the same server time and jams for MATCH_SECONDS. Scores and hand
 * skeletons stream live through Firebase Realtime Database:
 *
 *   rooms/{code}/meta          host, status, song, startAt
 *   rooms/{code}/players/{uid} name, title, ready, cognus (live), final
 *   rooms/{code}/hands/{uid}   left / right skeletons, ~10 times a second
 */
export const MATCH_SECONDS = 90;
export const MAX_PLAYERS = 6;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L lookalikes
const CODE_LENGTH = 5;

export type RoomStatus = "lobby" | "countdown" | "playing" | "done";
export type RoomSong =
  | { kind: "generated"; id: string }
  | { kind: "found"; id: string; title: string; subtitle: string; url: string; art?: string; link?: string };

export interface RoomMeta {
  host: string;
  createdAt: number;
  status: RoomStatus;
  song: RoomSong;
  startAt: number;
  round: number;
}
export interface RoomPlayer {
  name: string;
  title: string;
  joinedAt: number;
  ready: boolean;
  cognus: number;
  final: number | null;
}
/** One skeleton: 21 points as "x,y,x,y…" in thousandths. */
export interface RoomHands {
  l?: string;
  r?: string;
}

interface RoomState {
  code: string;
  uid: string;
  meta: RoomMeta | null;
  players: Record<string, RoomPlayer>;
  hands: Record<string, RoomHands>;
  /** server clock − local clock, ms */
  offset: number;
  error: string;
  closed: boolean;
}

const EMPTY: RoomState = { code: "", uid: "", meta: null, players: {}, hands: {}, offset: 0, error: "", closed: false };
let state: RoomState = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let subs: Unsubscribe[] = [];

export function useRoom() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => state,
    () => EMPTY,
  );
}
export const getRoom = () => state;
export const serverNow = () => Date.now() + state.offset;

// ---------------------------------------------------------------- helpers

/** Online play needs an identity; sign in as a guest if you aren't signed in. */
async function ensureUid(): Promise<string> {
  const f = fb();
  if (!f) throw new Error("Online play needs Firebase. Add your Firebase config to .env.local.");
  if (f.auth.currentUser) return f.auth.currentUser.uid;
  const cred = await signInAnonymously(f.auth);
  return cred.user.uid;
}

const randomCode = () => Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);

function me(): RoomPlayer {
  const p = getAccount().profile;
  return { name: p.name, title: itemById(p.equipped.title)?.name ?? "Rookie", joinedAt: Date.now(), ready: false, cognus: 0, final: null };
}

/** The Track a room song refers to (premium songs play for everyone during a match). */
export function songTrack(s: RoomSong): Track | null {
  if (s.kind === "found") return { id: s.id, kind: "found", title: s.title, subtitle: s.subtitle, url: s.url, art: s.art, link: s.link };
  const r = [...RECIPES, ...PREMIUM_RECIPES].find((x) => x.id === s.id);
  return r ? { id: r.id, kind: "generated", title: r.title, subtitle: r.mood, recipe: r } : null;
}
export function roomSong(t: Track): RoomSong | null {
  if (t.kind === "generated") return { kind: "generated", id: t.id };
  if (t.kind === "found") return { kind: "found", id: t.id, title: t.title, subtitle: t.subtitle, url: t.url, ...(t.art ? { art: t.art } : {}), ...(t.link ? { link: t.link } : {}) };
  return null; // uploads only exist in your own browser
}

function watch(code: string, uid: string) {
  const f = fb()!;
  subs.forEach((u) => u());
  state = { ...EMPTY, code, uid };
  emit();
  subs = [
    onValue(ref(f.db, ".info/serverTimeOffset"), (s) => {
      state = { ...state, offset: s.val() ?? 0 };
      emit();
    }),
    onValue(ref(f.db, `rooms/${code}/meta`), (s) => {
      // The host left and the room was removed.
      if (!s.exists()) state = { ...state, meta: null, closed: true };
      else state = { ...state, meta: s.val() };
      emit();
    }),
    onValue(ref(f.db, `rooms/${code}/players`), (s) => {
      const players: Record<string, RoomPlayer> = {};
      for (const [k, v] of Object.entries((s.val() ?? {}) as Record<string, RoomPlayer>)) players[k] = { ...v, final: v.final ?? null };
      state = { ...state, players };
      emit();
    }),
    onValue(ref(f.db, `rooms/${code}/hands`), (s) => {
      state = { ...state, hands: s.val() ?? {} };
      emit();
    }),
  ];
}

async function enter(code: string, uid: string, host: boolean) {
  const f = fb()!;
  const playerRef = ref(f.db, `rooms/${code}/players/${uid}`);
  await set(playerRef, me());
  // Closing the tab or losing connection takes you out of the room (and ends it, for the host).
  if (host) await onDisconnect(ref(f.db, `rooms/${code}`)).remove();
  else {
    await onDisconnect(playerRef).remove();
    await onDisconnect(ref(f.db, `rooms/${code}/hands/${uid}`)).remove();
  }
  watch(code, uid);
}

// ---------------------------------------------------------------- actions

export async function createRoom(song: RoomSong): Promise<string> {
  const f = fb();
  const uid = await ensureUid();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const meta: RoomMeta = { host: uid, createdAt: Date.now(), status: "lobby", song, startAt: 0, round: 0 };
    const res = await runTransaction(ref(f!.db, `rooms/${code}/meta`), (cur) => (cur ? undefined : meta));
    if (res.committed) {
      await enter(code, uid, true);
      return code;
    }
  }
  throw new Error("Couldn't make a room. Try again.");
}

export async function joinRoom(raw: string): Promise<void> {
  const f = fb();
  const code = cleanCode(raw);
  if (code.length !== CODE_LENGTH) throw new Error(`Room codes are ${CODE_LENGTH} letters.`);
  const uid = await ensureUid();
  const meta = await get(ref(f!.db, `rooms/${code}/meta`));
  if (!meta.exists()) throw new Error("No room with that code.");
  const players = await get(ref(f!.db, `rooms/${code}/players`));
  const ids = Object.keys(players.val() ?? {});
  if (!ids.includes(uid) && ids.length >= MAX_PLAYERS) throw new Error("That room is full.");
  if ((meta.val() as RoomMeta).status !== "lobby" && !ids.includes(uid)) throw new Error("That match already started. Wait for the next round.");
  await enter(code, uid, (meta.val() as RoomMeta).host === uid);
}

export async function leaveRoom() {
  const f = fb();
  const { code, uid, meta } = state;
  subs.forEach((u) => u());
  subs = [];
  state = EMPTY;
  emit();
  if (!f || !code) return;
  if (meta?.host === uid) await remove(ref(f.db, `rooms/${code}`)).catch(() => {});
  else {
    await remove(ref(f.db, `rooms/${code}/players/${uid}`)).catch(() => {});
    await remove(ref(f.db, `rooms/${code}/hands/${uid}`)).catch(() => {});
  }
}

const mine = () => `rooms/${state.code}/players/${state.uid}`;

export async function setReady(ready: boolean) {
  const f = fb();
  if (f && state.code) await update(ref(f.db, mine()), { ready });
}

export async function setSong(song: RoomSong) {
  const f = fb();
  if (f && state.code && state.meta?.host === state.uid) await update(ref(f.db, `rooms/${state.code}/meta`), { song });
}

/** Host: everyone starts four seconds from now (server time). */
export async function startMatch() {
  const f = fb();
  if (!f || !state.code || state.meta?.host !== state.uid) return;
  const resets: Record<string, unknown> = {};
  for (const id of Object.keys(state.players)) {
    resets[`players/${id}/cognus`] = 0;
    resets[`players/${id}/final`] = null;
  }
  await update(ref(f.db, `rooms/${state.code}`), {
    ...resets,
    "meta/status": "countdown",
    "meta/startAt": serverNow() + 4000,
    "meta/round": (state.meta.round ?? 0) + 1,
  });
}

/** Host: flip countdown → playing → done as the clock runs. */
export async function advance(status: RoomStatus) {
  const f = fb();
  if (f && state.code && state.meta?.host === state.uid && state.meta.status !== status) await update(ref(f.db, `rooms/${state.code}/meta`), { status });
}

/** Host: back to the lobby for another round. */
export async function backToLobby() {
  const f = fb();
  if (!f || !state.code || state.meta?.host !== state.uid) return;
  const resets: Record<string, unknown> = { "meta/status": "lobby" };
  for (const id of Object.keys(state.players)) resets[`players/${id}/ready`] = false;
  await update(ref(f.db, `rooms/${state.code}`), resets);
}

let lastScore = 0;
export function pushScore(cognus: number) {
  const f = fb();
  if (!f || !state.code || Date.now() - lastScore < 500) return;
  lastScore = Date.now();
  void update(ref(f.db, mine()), { cognus: Math.round(cognus) }).catch(() => {});
}

export async function pushFinal(cognus: number) {
  const f = fb();
  if (f && state.code) await update(ref(f.db, mine()), { cognus: Math.round(cognus), final: Math.round(cognus) });
}

let lastHands = 0;
/** Stream your skeleton (~10 Hz). */
export function pushHands(hands: { side: "left" | "right"; pts: [number, number][] }[]) {
  const f = fb();
  if (!f || !state.code || Date.now() - lastHands < 100) return;
  lastHands = Date.now();
  const enc = (pts: [number, number][]) => pts.map(([x, y]) => `${Math.round(x * 999)},${Math.round(y * 999)}`).join(",");
  const out: Record<string, string | object | null> = { l: null, r: null, t: serverTimestamp() };
  for (const h of hands) out[h.side === "left" ? "l" : "r"] = enc(h.pts);
  void set(ref(f.db, `rooms/${state.code}/hands/${state.uid}`), out).catch(() => {});
}

export function decodeHand(s?: string): [number, number][] | null {
  if (!s) return null;
  const n = s.split(",").map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i] / 999, n[i + 1] / 999]);
  return pts.length === 21 ? pts : null;
}

/** Standings, best first. Live cognus while playing, final once in. */
export function standings(players: Record<string, RoomPlayer>) {
  return Object.entries(players)
    .map(([uid, p]) => ({ uid, ...p, score: p.final ?? p.cognus ?? 0 }))
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
}

/** Bonus Cognus for finishing on the podium (only with company, and only if you scored). */
export function placementBonus(place: number, count: number, score = 1) {
  if (count < 2 || score <= 0) return 0;
  return [25, 12, 6][place] ?? 0;
}

/** A win needs company and a score strictly ahead of second place. */
export function isWin(list: { uid: string; score: number }[], uid: string) {
  return list.length > 1 && list[0].uid === uid && list[0].score > list[1].score;
}
