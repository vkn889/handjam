"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ListMusic, Play, Plus, Trash2, Wand2, X } from "lucide-react";
import { Card, inputClass, Panel, Pill } from "@/components/ui/pill";
import { deletePlaylist, newPlaylistId, ownedSet, savePlaylist, useAccount, type Playlist } from "@/lib/account";
import { player } from "@/lib/engine";
import { allTracks, coverFor, type Track } from "@/lib/library";
import { cn } from "@/lib/utils";

const COLORS = ["#E8FF1F", "#5AD2F4", "#FF4FD8", "#36E0A3", "#F2701D", "#8FB8FF"];
const TEMPLATES: { name: string; sections: string[] }[] = [
  { name: "Warm-up → Peak → Cool-down", sections: ["Warm-up", "Peak", "Cool-down"] },
  { name: "Practice set", sections: ["Learn the moves", "Free jam"] },
  { name: "Battle prep", sections: ["Fast", "Faster"] },
];
const bpmOf = (t: Track) => (t.kind === "generated" ? t.recipe.bpm : 0);

/**
 * Playlists with sections: a set you jam through in order. Play the whole thing, or one
 * section. "Auto-build" sorts your library by tempo into warm-up, peak and cool-down.
 */
export function PlaylistsView({ onPlayed }: { onPlayed: () => void }) {
  const { profile } = useAccount();
  const [tracks, setTracks] = useState<Track[]>([]);
  const lists = useMemo(() => Object.values(profile.playlists).sort((a, b) => b.updatedAt - a.updatedAt), [profile.playlists]);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = lists.find((l) => l.id === openId) ?? null;
  const owned = useMemo(() => ownedSet(profile), [profile]);

  useEffect(() => void allTracks(owned).then(setTracks), [owned]);
  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  const create = (template = TEMPLATES[0], auto = false) => {
    const sections = template.sections.map((name) => ({ name, trackIds: [] as string[] }));
    if (auto && tracks.length) {
      // slow third → warm-up, fastest → peak, the rest → cool-down
      const sorted = [...tracks].sort((a, b) => bpmOf(a) - bpmOf(b));
      const third = Math.ceil(sorted.length / 3);
      sections[0].trackIds = sorted.slice(third, third * 2).map((t) => t.id);
      sections[1].trackIds = sorted.slice(third * 2).map((t) => t.id);
      sections[2].trackIds = sorted.slice(0, third).reverse().map((t) => t.id);
    }
    const pl: Playlist = { id: newPlaylistId(), name: auto ? "Auto mix" : `Playlist ${lists.length + 1}`, color: COLORS[lists.length % COLORS.length], sections, updatedAt: Date.now() };
    void savePlaylist(pl);
    setOpenId(pl.id);
  };

  const play = async (pl: Playlist, section?: number) => {
    const ids = (section === undefined ? pl.sections : [pl.sections[section]]).flatMap((s) => s.trackIds);
    const queue = ids.map((id) => byId.get(id)).filter((t): t is Track => !!t);
    if (!queue.length) return;
    await player.playQueue(queue);
    onPlayed();
  };

  return (
    <Panel
      wide
      title="Playlists"
      subtitle="Build a set in sections, then jam through it in order."
      actions={
        <>
          <Pill onClick={() => create(TEMPLATES[0], true)} disabled={!tracks.length}><Wand2 size={15} /> Auto-build by tempo</Pill>
          <Pill tone="accent" onClick={() => create()}><Plus size={15} /> New playlist</Pill>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="grid content-start gap-2">
          {!lists.length && <Card className="text-sm text-white/60">No playlists yet. Start one, or let auto-build sort your songs by tempo.</Card>}
          {lists.map((l) => {
            const n = l.sections.reduce((a, s) => a + s.trackIds.length, 0);
            return (
              <button
                key={l.id}
                data-hand-target=""
                onClick={() => setOpenId(l.id)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-colors", l.id === openId ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]")}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-black" style={{ background: l.color }}><ListMusic size={18} /></span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{l.name}</span>
                  <span className="block text-xs text-white/50">{l.sections.length} sections · {n} songs</span>
                </span>
              </button>
            );
          })}
          {!!lists.length && (
            <div className="mt-2">
              <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Templates</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => <Pill key={t.name} size="sm" onClick={() => create(t)}>{t.name}</Pill>)}
              </div>
            </div>
          )}
        </div>

        {open ? <Editor key={open.id} pl={open} tracks={tracks} byId={byId} onPlay={play} onDelete={() => (void deletePlaylist(open.id), setOpenId(null))} /> : lists.length ? <Card className="text-white/60">Pick a playlist to edit it.</Card> : null}
      </div>
    </Panel>
  );
}

function Editor({ pl, tracks, byId, onPlay, onDelete }: { pl: Playlist; tracks: Track[]; byId: Map<string, Track>; onPlay: (pl: Playlist, section?: number) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(pl);
  const [adding, setAdding] = useState<number | null>(null);
  const commit = (next: Playlist) => {
    setDraft(next);
    void savePlaylist(next);
  };
  const editSection = (i: number, fn: (ids: string[]) => string[]) =>
    commit({ ...draft, sections: draft.sections.map((s, j) => (j === i ? { ...s, trackIds: fn(s.trackIds) } : s)) });
  const move = <T,>(arr: T[], i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= arr.length) return arr;
    const out = [...arr];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="pl-name">Playlist name</label>
        <input id="pl-name" className={cn(inputClass, "max-w-xs text-base")} value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => commit(draft)} />
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button key={c} data-hand-target="" aria-label={`Colour ${c}`} onClick={() => commit({ ...draft, color: c })} className={cn("h-7 w-7 cursor-pointer rounded-full border-2", draft.color === c ? "border-white" : "border-transparent")} style={{ background: c }} />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Pill tone="accent" onClick={() => onPlay(draft)}><Play size={15} /> Play all</Pill>
          <Pill tone="danger" aria-label="Delete playlist" onClick={onDelete}><Trash2 size={15} /></Pill>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {draft.sections.map((s, i) => (
          <section key={i} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white/40">{i + 1}</span>
              <input
                aria-label="Section name"
                className="h-9 min-w-0 flex-1 rounded-xl bg-transparent px-2 font-medium focus:bg-white/5 focus:outline-none"
                value={s.name}
                onChange={(e) => setDraft({ ...draft, sections: draft.sections.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                onBlur={() => commit(draft)}
              />
              <Pill size="sm" aria-label="Move section up" onClick={() => commit({ ...draft, sections: move(draft.sections, i, -1) })}><ArrowUp size={14} /></Pill>
              <Pill size="sm" aria-label="Move section down" onClick={() => commit({ ...draft, sections: move(draft.sections, i, 1) })}><ArrowDown size={14} /></Pill>
              <Pill size="sm" onClick={() => onPlay(draft, i)} disabled={!s.trackIds.length}><Play size={13} /> Section</Pill>
              <Pill size="sm" tone="danger" aria-label="Remove section" onClick={() => commit({ ...draft, sections: draft.sections.filter((_, j) => j !== i) })}><X size={14} /></Pill>
            </div>
            <ol className="mt-3 grid gap-1.5">
              {s.trackIds.map((id, k) => {
                const t = byId.get(id);
                return (
                  <li key={id + k} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {t ? <img alt="" src={coverFor(t)} className="h-9 w-9 rounded-lg object-cover" /> : <span className="h-9 w-9 rounded-lg bg-white/10" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{t?.title ?? "Unavailable song"}</span>
                      <span className="block truncate text-[11px] text-white/45">{t ? (bpmOf(t) ? `${bpmOf(t)} BPM · ${t.subtitle}` : t.subtitle) : "Not in this browser"}</span>
                    </span>
                    <button data-hand-target="" aria-label="Up" className="cursor-pointer p-1.5 text-white/50 hover:text-white" onClick={() => editSection(i, (ids) => move(ids, k, -1))}><ArrowUp size={14} /></button>
                    <button data-hand-target="" aria-label="Down" className="cursor-pointer p-1.5 text-white/50 hover:text-white" onClick={() => editSection(i, (ids) => move(ids, k, 1))}><ArrowDown size={14} /></button>
                    <button data-hand-target="" aria-label="Remove" className="cursor-pointer p-1.5 text-white/50 hover:text-red-300" onClick={() => editSection(i, (ids) => ids.filter((_, j) => j !== k))}><X size={14} /></button>
                  </li>
                );
              })}
            </ol>
            {adding === i ? (
              <div className="mt-3 grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-white/10 p-2">
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    data-hand-target=""
                    onClick={() => editSection(i, (ids) => [...ids, t.id])}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
                  >
                    <Plus size={14} className="text-[#E8FF1F]" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-[11px] text-white/45">{bpmOf(t) ? `${bpmOf(t)} BPM` : t.kind === "upload" ? "Upload" : "Found"}</span>
                  </button>
                ))}
                <Pill size="sm" className="mt-1" onClick={() => setAdding(null)}>Done</Pill>
              </div>
            ) : (
              <Pill size="sm" className="mt-3" onClick={() => setAdding(i)}><Plus size={14} /> Add songs</Pill>
            )}
          </section>
        ))}
        <Pill className="justify-self-start" onClick={() => commit({ ...draft, sections: [...draft.sections, { name: `Section ${draft.sections.length + 1}`, trackIds: [] }] })}>
          <Plus size={15} /> Add section
        </Pill>
      </div>
    </Card>
  );
}
