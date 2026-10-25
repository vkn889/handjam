"use client";

import { RECIPES, renderRecipe, type Recipe } from "./tracks";

/**
 * Everything you can play: generated tracks, songs you've uploaded before (kept in this
 * browser's IndexedDB, never uploaded anywhere), and songs you found with the music finder.
 */
export type Track =
  | { id: string; kind: "generated"; title: string; subtitle: string; recipe: Recipe }
  | { id: string; kind: "upload"; title: string; subtitle: string; addedAt: number }
  | { id: string; kind: "found"; title: string; subtitle: string; url: string; art?: string; link?: string };

const DB = "handjam";
const STORE = "uploads";
const FOUND_KEY = "handjam-found";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function saveUpload(file: File): Promise<Track> {
  const id = `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const title = file.name.replace(/\.[^.]+$/, "");
  const addedAt = Date.now();
  try {
    // IndexedDB stores the File (a Blob) directly.
    await tx("readwrite", (s) => s.put({ id, title, addedAt, type: file.type, data: file }));
  } catch {
    /* storage full or private mode: still playable this session */
  }
  return { id, kind: "upload", title, subtitle: "Your upload", addedAt };
}

export async function listUploads(): Promise<Track[]> {
  try {
    const rows = await tx<{ id: string; title: string; addedAt: number }[]>("readonly", (s) => s.getAll());
    return rows
      .sort((a, b) => b.addedAt - a.addedAt)
      .map((r) => ({ id: r.id, kind: "upload" as const, title: r.title, subtitle: "Your upload · " + new Date(r.addedAt).toLocaleDateString(), addedAt: r.addedAt }));
  } catch {
    return [];
  }
}

export async function removeUpload(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

export function listFound(): Track[] {
  try {
    return JSON.parse(localStorage.getItem(FOUND_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function rememberFound(t: Extract<Track, { kind: "found" }>) {
  const all = [t, ...listFound().filter((x) => x.id !== t.id)].slice(0, 30);
  try {
    localStorage.setItem(FOUND_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export const generatedTracks = (): Track[] => RECIPES.map((r) => ({ id: r.id, kind: "generated", title: r.title, subtitle: r.mood, recipe: r }));

export async function allTracks(): Promise<Track[]> {
  return [...(await listUploads()), ...listFound(), ...generatedTracks()];
}

/** Decode a track into audio the deck can play. */
export async function decodeTrack(ctx: AudioContext, t: Track): Promise<AudioBuffer> {
  if (t.kind === "generated") return renderRecipe(ctx, t.recipe);
  if (t.kind === "upload") {
    const row = await tx<{ data: Blob } | undefined>("readonly", (s) => s.get(t.id));
    if (!row) throw new Error("That upload is no longer saved in this browser.");
    return ctx.decodeAudioData(await row.data.arrayBuffer());
  }
  const res = await fetch(t.url);
  if (!res.ok) throw new Error("Couldn't download that song.");
  return ctx.decodeAudioData(await res.arrayBuffer());
}

// ---------------------------------------------------------------- play counts

const PLAYS_KEY = "handjam-plays";
interface PlayRow {
  count: number;
  title: string;
  art: string;
}

/** Album-style cover for any track: its real artwork, or a generated stripe design. */
export function coverFor(t: Track): string {
  if (t.kind === "found" && t.art) return t.art;
  const [a, b, c] = t.kind === "generated" ? t.recipe.palette : ["#141821", "#4a52ff", "#e8ff1f"];
  const stripes = Array.from({ length: 12 }, (_, i) => `<rect x="${i * 60 - 80}" y="-100" width="26" height="800" fill="${i % 3 ? b : c}" transform="rotate(24 300 300)"/>`).join("");
  const label = t.title.replace(/[<&>"]/g, "").slice(0, 22).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="${a}"/>${stripes}<circle cx="300" cy="300" r="150" fill="${a}"/><circle cx="300" cy="300" r="22" fill="${c}"/><text x="300" y="560" font-family="Helvetica,Arial,sans-serif" font-size="40" font-weight="800" text-anchor="middle" fill="#fff">${label}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function recordPlay(t: Track) {
  try {
    const rows: Record<string, PlayRow> = JSON.parse(localStorage.getItem(PLAYS_KEY) ?? "{}");
    const row = rows[t.id] ?? { count: 0, title: t.title, art: coverFor(t) };
    row.count++;
    rows[t.id] = row;
    localStorage.setItem(PLAYS_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** The songs you've played most, most first. */
export function mostPlayed(limit = 8): { src: string; alt: string }[] {
  try {
    const rows: Record<string, PlayRow> = JSON.parse(localStorage.getItem(PLAYS_KEY) ?? "{}");
    return Object.values(rows)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((r) => ({ src: r.art, alt: `${r.title}, played ${r.count} times` }));
  } catch {
    return [];
  }
}
