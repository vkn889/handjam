"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Crown, LogIn, LogOut, Music, Play, Plus, RotateCcw, Users } from "lucide-react";
import { ComboToast } from "@/components/ComboToast";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { Card, inputClass, Panel, Pill } from "@/components/ui/pill";
import { bankSession, ownedSet, useAccount, type Award } from "@/lib/account";
import { endSession, player, startSession, trackedHands, useEngine } from "@/lib/engine";
import { firebaseEnabled } from "@/lib/firebase";
import { listFound } from "@/lib/library";
import {
  advance,
  backToLobby,
  cleanCode,
  createRoom,
  decodeHand,
  getRoom,
  isWin,
  joinRoom,
  leaveRoom,
  MATCH_SECONDS,
  MAX_PLAYERS,
  placementBonus,
  pushFinal,
  pushHands,
  pushScore,
  roomSong,
  serverNow,
  setReady,
  setSong,
  songTrack,
  startMatch,
  standings,
  useRoom,
  type RoomHands,
  type RoomSong,
} from "@/lib/online";
import { PREMIUM_RECIPES, RECIPES } from "@/lib/tracks";
import { cn } from "@/lib/utils";

/**
 * Online battles: make a room or join one with a code, everyone jams the same song for
 * MATCH_SECONDS, the most Cognus wins. While playing you see each opponent's hands live.
 */
export function OnlineView() {
  const room = useRoom();
  useMatchDriver();
  const status = room.meta?.status;

  if (!firebaseEnabled)
    return (
      <Panel title="Online" subtitle="Battle friends with a join code.">
        <Card className="text-sm leading-relaxed text-white/75">
          Online play needs Firebase. Add your web config to <code className="rounded bg-white/10 px-1.5">.env.local</code> (see <code className="rounded bg-white/10 px-1.5">.env.example</code>), or run the local emulators with <code className="rounded bg-white/10 px-1.5">npm run emulators</code>.
        </Card>
      </Panel>
    );
  if (room.closed) return <Closed />;
  if (!room.code || !room.meta) return <Entry />;
  if (status === "lobby") return <Lobby />;
  if (status === "done") return <Podium />;
  return <Match />;
}

// ---------------------------------------------------------------- the clock

/** Runs the match on every client: load, start together, stream, finish, bank. */
function useMatchDriver() {
  const room = useRoom();
  const { state } = useEngine();
  const round = useRef({ loaded: 0, started: 0, finished: 0, banked: 0 });
  const summary = useRef<ReturnType<typeof endSession>>(null);
  const [, force] = useState(0);
  const meta = room.meta;

  // Load the song during the countdown so everyone starts on the same beat.
  useEffect(() => {
    if (!meta || meta.status !== "countdown" || round.current.loaded === meta.round) return;
    round.current.loaded = meta.round;
    const t = songTrack(meta.song);
    player.pause();
    if (t) void player.playTrack(t, false);
  }, [meta]);

  // A 100 ms clock against server time.
  useEffect(() => {
    if (!meta || (meta.status !== "countdown" && meta.status !== "playing")) return;
    const id = window.setInterval(() => {
      const now = serverNow();
      const r = round.current;
      const end = meta.startAt + MATCH_SECONDS * 1000;
      if (now >= meta.startAt && r.started !== meta.round) {
        r.started = meta.round;
        player.seek(0);
        startSession();
        void advance("playing");
      }
      if (now >= end && r.finished !== meta.round && r.started === meta.round) {
        r.finished = meta.round;
        summary.current = endSession();
        void pushFinal(summary.current?.cognus ?? 0);
      }
      // Host closes the round once everyone's in (or stragglers time out).
      const all = Object.values(getRoom().players);
      if (now >= end && (all.every((p) => p.final !== null) || now >= end + 8000)) void advance("done");
      force((n) => n + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [meta]);

  // Stream score and skeleton while playing.
  useEffect(() => {
    if (meta?.status !== "playing" || !state?.session) return;
    pushScore(state.session.cognus);
    pushHands(trackedHands());
  }, [meta?.status, state]);

  // Bank once per round when results are in.
  useEffect(() => {
    if (!meta || meta.status !== "done" || round.current.banked === meta.round || !summary.current) return;
    round.current.banked = meta.round;
    const list = standings(getRoom().players);
    const place = list.findIndex((p) => p.uid === getRoom().uid);
    const s = summary.current;
    void bankSession(s, placementBonus(place, list.length, s?.cognus ?? 0), isWin(list, getRoom().uid)).then((a) => {
      lastAward = { ...a, place, round: meta.round };
      force((n) => n + 1);
    });
  }, [meta]);
}
let lastAward: (Award & { place: number; round: number }) | null = null;

// ---------------------------------------------------------------- screens

function Entry() {
  const { profile, user } = useAccount();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Online" subtitle={`Battle up to ${MAX_PLAYERS - 1} friends. Same song, ${MATCH_SECONDS} seconds, most Cognus wins. Podium finishes earn bonus Cognus.`}>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="flex flex-col">
          <p className="text-xl font-light">Make a room</p>
          <p className="mt-1 text-sm text-white/60">You&apos;re the host: pick the song and start the match. Share the code with friends.</p>
          <div className="mt-auto pt-6">
            <LiquidMetalButton label={busy ? "Creating…" : "Create room"} width={170} icon={<Plus size={15} />} onClick={() => void run(() => createRoom({ kind: "generated", id: RECIPES[0].id }))} />
          </div>
        </Card>
        <Card>
          <p className="text-xl font-light">Join with a code</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => joinRoom(code));
            }}
          >
            <label className="sr-only" htmlFor="room-code">Room code</label>
            <input
              id="room-code"
              className={cn(inputClass, "h-14 text-center font-mono text-2xl uppercase tracking-[0.4em]")}
              value={code}
              onChange={(e) => setCode(cleanCode(e.target.value))}
              placeholder="ABC23"
              autoComplete="off"
              spellCheck={false}
            />
            <Pill type="submit" tone="solid" className="h-14" disabled={busy || code.length < 5}><LogIn size={16} /> Join</Pill>
          </form>
        </Card>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <p className="mt-5 text-sm text-white/55">
        Playing as <span className="text-white">{profile.name}</span>
        {!user && " (a guest account is made for you when you join)"}.
      </p>
    </Panel>
  );
}

function Lobby() {
  const room = useRoom();
  const { profile } = useAccount();
  const meta = room.meta!;
  const isHost = meta.host === room.uid;
  const players = standings(room.players).sort((a, b) => a.joinedAt - b.joinedAt);
  const meReady = !!room.players[room.uid]?.ready;
  const [copied, setCopied] = useState(false);
  const song = songTrack(meta.song);
  const owned = useMemo(() => ownedSet(profile), [profile]);
  const choices = useMemo(() => {
    const gen = [...RECIPES, ...PREMIUM_RECIPES.filter((r) => owned.has(r.id))].map((r) => ({ label: r.title, sub: `${r.bpm} BPM · ${r.mood}`, song: { kind: "generated", id: r.id } as RoomSong }));
    const found = listFound()
      .map((t) => ({ label: t.title, sub: t.subtitle, song: roomSong(t) }))
      .filter((x): x is { label: string; sub: string; song: RoomSong } => !!x.song);
    return [...gen, ...found];
  }, [owned]);

  return (
    <Panel
      title="Lobby"
      subtitle={isHost ? "Share the code. Start whenever you're ready." : "Waiting for the host to start."}
      actions={<Pill tone="danger" onClick={() => void leaveRoom()}><LogOut size={15} /> Leave</Pill>}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Room code</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-5xl tracking-[0.25em] text-[#E8FF1F]">{room.code}</span>
            <Pill
              size="sm"
              aria-label="Copy code"
              onClick={() => {
                void navigator.clipboard?.writeText(room.code);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Pill>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-white/60"><Users size={15} /> {players.length} / {MAX_PLAYERS} players</p>
          <ul className="mt-3 grid gap-2">
            {players.map((p) => (
              <li key={p.uid} className="flex items-center gap-3 rounded-2xl bg-black/30 px-4 py-2.5">
                {p.uid === meta.host ? <Crown size={16} className="text-[#E8FF1F]" /> : <span className="w-4" />}
                <span className="flex-1">
                  {p.name}
                  {p.uid === room.uid && " (you)"}
                  <span className="block text-[11px] text-white/45">{p.title}</span>
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", p.ready ? "bg-[#E8FF1F] text-black" : "bg-white/10 text-white/50")}>{p.ready ? "Ready" : "Not ready"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <LiquidMetalButton label={meReady ? "Not ready" : "I'm ready"} width={150} icon={<Check size={15} />} onClick={() => void setReady(!meReady)} />
            {isHost && <LiquidMetalButton label="Start match" width={160} icon={<Play size={15} />} onClick={() => void startMatch()} />}
          </div>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50"><Music size={14} /> Song</p>
          <p className="mt-2 text-2xl font-light">{song?.title ?? "Unknown song"}</p>
          <p className="text-sm text-white/55">{song?.subtitle}</p>
          {isHost && (
            <div className="mt-4 grid max-h-[46vh] gap-1 overflow-y-auto pr-1">
              {choices.map((c) => {
                const on = c.song.id === meta.song.id;
                return (
                  <button
                    key={c.song.id}
                    data-hand-target=""
                    onClick={() => void setSong(c.song)}
                    className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors", on ? "bg-white text-black" : "hover:bg-white/10")}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className={cn("shrink-0 text-[11px]", on ? "text-black/60" : "text-white/45")}>{c.sub}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Panel>
  );
}
function Match() {
  const room = useRoom();
  const { state } = useEngine();
  const meta = room.meta!;
  const now = serverNow();
  const countdown = Math.ceil((meta.startAt - now) / 1000);
  const left = Math.max(0, Math.ceil((meta.startAt + MATCH_SECONDS * 1000 - now) / 1000));
  const list = standings(room.players);
  const others = list.filter((p) => p.uid !== room.uid);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[76px] z-30">
      {now < meta.startAt ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="hud-text text-sm tracking-[0.35em] text-white/80">GET YOUR HANDS UP</p>
            <p className="hud-text text-[10rem] font-light leading-none">{Math.max(1, countdown)}</p>
            <p className="hud-text text-lg">{songTrack(meta.song)?.title}</p>
          </div>
        </div>
      ) : (
        <div className="absolute left-1/2 top-[22%] -translate-x-1/2 text-center">
          <p className="hud-text text-xs font-semibold tracking-[0.3em] text-white/75">BATTLE · {left}s</p>
          <p className="hud-text text-3xl font-light"><span className="text-[#E8FF1F]">{state?.session?.cognus ?? room.players[room.uid]?.final ?? 0}</span> Cognus</p>
          <ComboToast session={state?.session ?? null} />
          {left === 0 && <p className="hud-text mt-1 text-sm text-white/80">Waiting for everyone&apos;s score…</p>}
        </div>
      )}

      {/* live standings */}
      <ol className="absolute right-4 top-4 w-60 rounded-3xl border border-white/10 bg-black/45 p-3 backdrop-blur-md">
        {list.map((p, i) => (
          <li key={p.uid} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-all", p.uid === room.uid && "bg-[#E8FF1F]/20")}>
            <span className="w-4 text-white/50">{i + 1}</span>
            <span className="flex-1 truncate">{p.name}</span>
            <span className="tabular-nums text-[#E8FF1F]">{p.uid === room.uid ? state?.session?.cognus ?? p.score : p.score}</span>
          </li>
        ))}
      </ol>

      {/* opponents' hands, live */}
      <div className="absolute left-4 top-4 grid gap-3">
        {others.map((p) => (
          <div key={p.uid} className="w-[220px] overflow-hidden rounded-3xl border border-white/10 bg-black/50 backdrop-blur-md">
            <Skeleton hands={room.hands[p.uid]} />
            <div className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="truncate">{p.name}</span>
              <span className="tabular-nums text-[#E8FF1F]">{p.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MediaPipe hand connections (21 landmarks)
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function Skeleton({ hands }: { hands?: RoomHands }) {
  const W = 220;
  const H = 124;
  const draw = (s: string | undefined, color: string) => {
    const pts = decodeHand(s);
    if (!pts) return null;
    const P = (i: number) => [pts[i][0] * W, pts[i][1] * H] as const;
    return (
      <g>
        {BONES.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={P(a)[0]} y1={P(a)[1]} x2={P(b)[0]} y2={P(b)[1]} stroke={color} strokeWidth={2} strokeLinecap="round" />
        ))}
        {pts.map((_, i) => <circle key={i} cx={P(i)[0]} cy={P(i)[1]} r={i % 4 === 0 ? 3 : 2} fill="#fff" />)}
      </g>
    );
  };
  const none = !decodeHand(hands?.l) && !decodeHand(hands?.r);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-[124px] w-full bg-gradient-to-b from-white/[0.06] to-transparent" aria-label="Opponent's hands">
      {draw(hands?.l, "#5AD2F4")}
      {draw(hands?.r, "#E8FF1F")}
      {none && <text x={W / 2} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={12}>No hands in view</text>}
    </svg>
  );
}

function Podium() {
  const room = useRoom();
  const meta = room.meta!;
  const isHost = meta.host === room.uid;
  const list = standings(room.players);
  const award = lastAward?.round === meta.round ? lastAward : null;
  const order = [1, 0, 2].filter((i) => list[i]);
  const heights = ["h-40", "h-28", "h-20"];

  return (
    <Panel
      title={isWin(list, room.uid) ? "You won!" : list.length > 1 && list[0].score === list[1].score ? "It's a tie!" : "Results"}
      subtitle={songTrack(meta.song)?.title}
      actions={
        <>
          {isHost && <LiquidMetalButton label="Play again" width={150} icon={<RotateCcw size={15} />} onClick={() => void backToLobby()} />}
          <Pill tone="danger" onClick={() => void leaveRoom()}><LogOut size={15} /> Leave</Pill>
        </>
      }
    >
      <div className="flex items-end justify-center gap-4 pt-6">
        {order.map((i) => (
          <div key={list[i].uid} className="flex w-40 flex-col items-center">
            <p className="truncate text-center text-lg">{list[i].name}</p>
            <p className="text-2xl font-light text-[#E8FF1F]">{list[i].score}</p>
            <div className={cn("mt-2 grid w-full place-items-center rounded-t-3xl border border-white/10 bg-white/10 text-4xl font-light", heights[i])}>{i + 1}</div>
          </div>
        ))}
      </div>
      {list.length > 3 && (
        <ol start={4} className="mx-auto mt-6 max-w-md">
          {list.slice(3).map((p, i) => (
            <li key={p.uid} className="flex justify-between border-b border-white/10 py-2 text-sm">
              <span>{i + 4}. {p.name}</span>
              <span className="text-[#E8FF1F]">{p.score}</span>
            </li>
          ))}
        </ol>
      )}
      {award && (
        <Card className="mx-auto mt-8 max-w-xl text-center">
          <p className="text-3xl font-light">+<span className="text-[#E8FF1F]">{award.earned + award.bonus}</span> Cognus banked</p>
          <p className="mt-2 text-sm text-white/65">
            {award.earned} from your jam
            {award.bonus ? ` · +${award.bonus} bonus` : ""}
            {award.challenges.length ? ` · challenges: ${award.challenges.join(", ")}` : ""}
          </p>
          {award.rankUp && <p className="mt-2 text-[#E8FF1F]">Rank up! You&apos;re now {award.rankUp}.</p>}
          {award.tiersGained > 0 && <p className="mt-1 text-sm">+{award.tiersGained} season pass tier{award.tiersGained > 1 ? "s" : ""}</p>}
        </Card>
      )}
      {!isHost && <p className="mt-6 text-center text-sm text-white/55">The host can start another round.</p>}
    </Panel>
  );
}

function Closed() {
  return (
    <Panel title="Room closed" subtitle="The host left, so the room ended.">
      <Pill tone="solid" onClick={() => void leaveRoom()}>Back</Pill>
    </Panel>
  );
}
