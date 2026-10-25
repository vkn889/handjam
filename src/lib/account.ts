"use client";

import { useSyncExternalStore } from "react";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { onValue, ref, runTransaction, set, update, type Unsubscribe } from "firebase/database";
import {
  dailyChallenges,
  DEFAULT_EQUIPPED,
  itemById,
  rankFor,
  SEASON,
  STARTER,
  TIERS,
  tierFor,
  todayKey,
  type Equipped,
  type ItemKind,
} from "./catalog";
import { fb, firebaseEnabled } from "./firebase";
import { listSessions, type SessionSummary } from "./session";

/**
 * Your HandJam profile: Cognus balance, lifetime total, season pass progress, what you
 * own and have equipped, home-page customisation and playlists.
 *
 * Signed in → stored in Firebase at users/{uid} (and a public summary in leaderboard/{uid}).
 * Signed out or no Firebase → stored in this browser. Signing in carries local progress over.
 */
export interface PlaylistSection {
  name: string;
  trackIds: string[];
}
export interface Playlist {
  id: string;
  name: string;
  color: string;
  sections: PlaylistSection[];
  updatedAt: number;
}
export interface HeroCustom {
  speed: number;
  curve: number;
  tileHeight: number;
  includeMine: boolean;
}

export interface Profile {
  name: string;
  createdAt: number;
  cognus: number;
  lifetime: number;
  best: number;
  wins: number;
  season: { id: string; xp: number; claimed: Record<string, boolean> };
  inventory: Record<string, boolean>;
  equipped: Equipped;
  hero: HeroCustom;
  playlists: Record<string, Playlist>;
  daily: { date: string; done: Record<string, boolean> };
}

export const DEFAULT_HERO: HeroCustom = { speed: 3.5, curve: 80, tileHeight: 30, includeMine: true };

function freshProfile(name = "Player", fromHistory = true): Profile {
  const history = fromHistory && typeof window !== "undefined" ? listSessions() : [];
  const past = history.reduce((a, s) => a + s.cognus, 0);
  return {
    name,
    createdAt: Date.now(),
    cognus: past,
    lifetime: past,
    best: Math.max(0, ...history.map((s) => s.cognus)),
    wins: 0,
    season: { id: SEASON.id, xp: 0, claimed: {} },
    inventory: Object.fromEntries(STARTER.map((id) => [id, true])),
    equipped: { ...DEFAULT_EQUIPPED },
    hero: { ...DEFAULT_HERO },
    playlists: {},
    daily: { date: todayKey(), done: {} },
  };
}

/** Fill gaps (Firebase drops empty objects) and roll over the season / day. */
function normalise(p: Partial<Profile> | null, name?: string): Profile {
  const base = freshProfile(name);
  const out: Profile = {
    ...base,
    ...p,
    season: { ...base.season, ...(p?.season ?? {}), claimed: { ...(p?.season?.claimed ?? {}) } },
    inventory: { ...base.inventory, ...(p?.inventory ?? {}) },
    equipped: { ...base.equipped, ...(p?.equipped ?? {}) },
    hero: { ...base.hero, ...(p?.hero ?? {}) },
    playlists: Object.fromEntries(
      Object.entries(p?.playlists ?? {}).map(([k, v]) => [k, { ...v, sections: (v.sections ?? []).map((s) => ({ ...s, trackIds: s.trackIds ?? [] })) }]),
    ),
    daily: { date: todayKey(), done: {}, ...(p?.daily ?? {}) },
  };
  if (out.season.id !== SEASON.id) out.season = { id: SEASON.id, xp: 0, claimed: {} };
  if (out.daily.date !== todayKey()) out.daily = { date: todayKey(), done: {} };
  return out;
}

// ---------------------------------------------------------------- store

interface State {
  ready: boolean;
  user: { uid: string; name: string; email: string | null; anonymous: boolean } | null;
  profile: Profile;
}

const LOCAL_KEY = "handjam-profile";
// The server render (and hydration) always sees a blank profile; the real one loads after mount.
const SERVER: State = { ready: false, user: null, profile: freshProfile("Player", false) };
let state: State = SERVER;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let started = false;
let unsubProfile: Unsubscribe | null = null;
/** The display name typed at sign-up, used when that first profile is written. */
let pendingName = "";

function readLocal(): Profile {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return normalise(raw ? JSON.parse(raw) : null);
  } catch {
    return freshProfile();
  }
}
function writeLocal(p: Profile) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  state = { ...state, profile: readLocal() };
  const f = fb();
  if (!f) {
    state = { ...state, ready: true };
    queueMicrotask(emit);
    return;
  }
  queueMicrotask(emit);
  onAuthStateChanged(f.auth, (u: User | null) => {
    unsubProfile?.();
    unsubProfile = null;
    if (!u) {
      state = { ready: true, user: null, profile: readLocal() };
      emit();
      return;
    }
    const name = pendingName || u.displayName || (u.isAnonymous ? "Guest " + u.uid.slice(0, 4) : (u.email ?? "Player").split("@")[0]);
    state = { ...state, user: { uid: u.uid, name, email: u.email, anonymous: u.isAnonymous } };
    const userRef = ref(f.db, `users/${u.uid}`);
    unsubProfile = onValue(userRef, (snap) => {
      if (!snap.exists()) {
        // First sign-in: carry over local progress.
        const local = readLocal();
        void runTransaction(userRef, (cur) => cur ?? { ...local, name });
        return;
      }
      state = { ...state, ready: true, profile: normalise(snap.val(), name) };
      emit();
    });
  });
}

export function useAccount() {
  return useSyncExternalStore(
    (fn) => {
      start();
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => state,
    () => SERVER,
  );
}
export const getAccount = () => state;

/** Apply a change to the profile atomically (Firebase transaction, or local). Returns the new profile. */
async function mutate(fn: (p: Profile) => Profile | undefined): Promise<Profile | null> {
  const f = fb();
  const user = state.user;
  if (f && user) {
    const res = await runTransaction(ref(f.db, `users/${user.uid}`), (cur) => {
      const next = fn(normalise(cur, user.name));
      return next === undefined ? undefined : next;
    });
    if (!res.committed) return null;
    const next = normalise(res.snapshot.val(), user.name);
    state = { ...state, profile: next };
    emit();
    await publishLeaderboard(next);
    return next;
  }
  const next = fn(state.profile);
  if (!next) return null;
  state = { ...state, profile: next };
  writeLocal(next);
  emit();
  return next;
}

/** The public bit other players see on the leaderboard. */
async function publishLeaderboard(p: Profile) {
  const f = fb();
  const user = state.user;
  if (!f || !user) return;
  await set(ref(f.db, `leaderboard/${user.uid}`), {
    name: p.name,
    title: itemById(p.equipped.title)?.name ?? "Rookie",
    lifetime: p.lifetime,
    seasonXp: p.season.xp,
    best: p.best,
    wins: p.wins,
    updatedAt: Date.now(),
  }).catch(() => {});
}

// ---------------------------------------------------------------- auth

export const auth = {
  enabled: firebaseEnabled,
  async signUp(name: string, email: string, password: string) {
    const f = fb();
    if (!f) throw new Error("Accounts aren't set up yet.");
    const clean = (pendingName = name.trim().slice(0, 24) || "Player");
    try {
      // A guest keeps their progress: link the email to the same account.
      const cur = f.auth.currentUser;
      const cred = cur?.isAnonymous
        ? await linkWithCredential(cur, EmailAuthProvider.credential(email, password))
        : await createUserWithEmailAndPassword(f.auth, email, password);
      await updateProfile(cred.user, { displayName: clean });
      state = state.user ? { ...state, user: { ...state.user, name: clean, email, anonymous: false } } : state;
      await update(ref(f.db, `users/${cred.user.uid}`), { name: clean }).catch(() => {});
    } finally {
      pendingName = "";
    }
  },
  async signIn(email: string, password: string) {
    const f = fb();
    if (!f) throw new Error("Accounts aren't set up yet.");
    await signInWithEmailAndPassword(f.auth, email, password);
  },
  async google() {
    const f = fb();
    if (!f) throw new Error("Accounts aren't set up yet.");
    const cur = f.auth.currentUser;
    if (cur?.isAnonymous) {
      const cred = await linkWithPopup(cur, new GoogleAuthProvider());
      state = state.user ? { ...state, user: { ...state.user, email: cred.user.email, anonymous: false } } : state;
      emit();
    } else await signInWithPopup(f.auth, new GoogleAuthProvider());
  },
  async guest() {
    const f = fb();
    if (!f) throw new Error("Accounts aren't set up yet.");
    await signInAnonymously(f.auth);
  },
  async signOut() {
    const f = fb();
    if (f) await fbSignOut(f.auth);
  },
  async rename(name: string) {
    const clean = name.trim().slice(0, 24) || "Player";
    const f = fb();
    if (f?.auth.currentUser) await updateProfile(f.auth.currentUser, { displayName: clean });
    await mutate((p) => ({ ...p, name: clean }));
  },
};

/** Firebase errors → plain English. */
export function authMessage(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "That email and password don't match.";
  if (code.includes("email-already-in-use")) return "There's already an account with that email. Sign in instead.";
  if (code.includes("weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("invalid-email")) return "That email doesn't look right.";
  if (code.includes("popup")) return "The sign-in window was closed.";
  if (code.includes("operation-not-allowed")) return "That sign-in method isn't turned on in Firebase yet.";
  return e instanceof Error ? e.message : "Something went wrong.";
}

// ---------------------------------------------------------------- progress

export interface Award {
  earned: number;
  bonus: number;
  challenges: string[];
  rankUp: string | null;
  tiersGained: number;
}

/**
 * Bank a finished session. Earned Cognus adds to your balance, lifetime total and season XP.
 * Today's challenges you complete add bonus Cognus; online wins add a placement bonus.
 */
export async function bankSession(s: SessionSummary, placementBonus = 0, won = false): Promise<Award> {
  const before = state.profile;
  const done = dailyChallenges().filter((c) => !before.daily.done[c.id] && c.check(s));
  const bonus = done.reduce((a, c) => a + c.reward, 0) + placementBonus;
  const earned = Math.max(0, Math.min(20000, Math.round(s.cognus))); // plausibility cap per session
  const after = (await mutate((p) => ({
    ...p,
    cognus: p.cognus + earned + bonus,
    lifetime: p.lifetime + earned + bonus,
    best: Math.max(p.best, earned),
    wins: p.wins + (won ? 1 : 0),
    season: { ...p.season, xp: p.season.xp + earned + bonus },
    daily: { ...p.daily, done: { ...p.daily.done, ...Object.fromEntries(done.map((c) => [c.id, true])) } },
  }))) ?? state.profile;
  const r0 = rankFor(before.lifetime);
  const r1 = rankFor(after.lifetime);
  return {
    earned,
    bonus,
    challenges: done.map((c) => c.text),
    rankUp: r1.index > r0.index ? r1.name : null,
    tiersGained: tierFor(after.season.xp) - tierFor(before.season.xp),
  };
}

export async function buy(itemId: string): Promise<string> {
  const item = itemById(itemId);
  if (!item || item.passOnly) return "That isn't for sale.";
  if (state.profile.inventory[itemId]) return "You already own it.";
  if (state.profile.cognus < item.price) return `You need ${item.price - state.profile.cognus} more Cognus.`;
  const ok = await mutate((p) => (p.inventory[itemId] || p.cognus < item.price ? undefined : { ...p, cognus: p.cognus - item.price, inventory: { ...p.inventory, [itemId]: true } }));
  return ok ? "" : "Purchase failed. Try again.";
}

export async function claimTier(tier: number): Promise<string> {
  const t = TIERS.find((x) => x.tier === tier);
  if (!t) return "No such tier.";
  return (await mutate((p) => {
    if (p.season.claimed[tier] || tierFor(p.season.xp) < tier) return undefined;
    const next = { ...p, season: { ...p.season, claimed: { ...p.season.claimed, [tier]: true } } };
    if (t.reward.type === "cognus") next.cognus += t.reward.amount;
    else next.inventory = { ...next.inventory, [t.reward.id]: true };
    return next;
  }))
    ? ""
    : "Can't claim that yet.";
}

export async function equip(kind: ItemKind, id: string) {
  const slot = ({ wallpaper: "wallpaper", heroSet: "heroSet", theme: "theme", title: "title" } as const)[kind as "wallpaper"];
  if (!slot) return;
  await mutate((p) => (p.inventory[id] ? { ...p, equipped: { ...p.equipped, [slot]: id } } : undefined));
}

export async function setHero(h: Partial<HeroCustom>) {
  await mutate((p) => ({ ...p, hero: { ...p.hero, ...h } }));
}

// ---------------------------------------------------------------- playlists

export async function savePlaylist(pl: Playlist) {
  await mutate((p) => ({ ...p, playlists: { ...p.playlists, [pl.id]: { ...pl, updatedAt: Date.now() } } }));
}
export async function deletePlaylist(id: string) {
  await mutate((p) => {
    const next = { ...p.playlists };
    delete next[id];
    return { ...p, playlists: next };
  });
}
export const newPlaylistId = () => "pl-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export const ownedSet = (p: Profile) => new Set(Object.keys(p.inventory).filter((k) => p.inventory[k]));
