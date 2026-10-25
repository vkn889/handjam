"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Disc3,
  Gift,
  Globe,
  Home,
  ListMusic,
  Play,
  RotateCcw,
  Search,
  ShoppingBag,
  Square,
  Timer,
  Trophy,
  Upload,
  UserRound,
} from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { useAccount } from "@/lib/account";
import { rankFor } from "@/lib/catalog";
import { uploadSong } from "@/lib/engine";
import { cn } from "@/lib/utils";

export type NavTarget =
  | "home" | "free" | "session" | "online"
  | "library" | "finder" | "playlists"
  | "pass" | "leaderboard" | "market" | "stats" | "account";

type MenuItem = { id: NavTarget | "upload"; label: string; icon: React.ReactNode };
const MUSIC: MenuItem[] = [
  { id: "library", label: "Library", icon: <Disc3 size={16} /> },
  { id: "playlists", label: "Playlists", icon: <ListMusic size={16} /> },
  { id: "finder", label: "Find music", icon: <Search size={16} /> },
  { id: "upload", label: "Upload a song", icon: <Upload size={16} /> },
];
const REWARDS: MenuItem[] = [
  { id: "pass", label: "Season pass", icon: <Gift size={16} /> },
  { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={16} /> },
  { id: "market", label: "Market", icon: <ShoppingBag size={16} /> },
  { id: "stats", label: "Session stats", icon: <BarChart3 size={16} /> },
];

/**
 * One bar at the top for everything: play modes, a Music menu, a Rewards menu, your
 * balance and account. On the remix screen it swaps to remix tools so the camera stays clear.
 */
export function NavBar({
  view,
  cameraOn,
  inSession,
  onNavigate,
  onReset,
  onEndSession,
}: {
  view: string;
  cameraOn: boolean;
  inSession: boolean;
  onNavigate: (t: NavTarget) => void;
  onReset: () => void;
  onEndSession: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [menu, setMenu] = useState<"music" | "rewards" | null>(null);
  const { profile, user } = useAccount();
  const rank = rankFor(profile.lifetime);
  const remix = view === "remix";
  const bar = useRef<HTMLElement>(null);

  // close a menu when you click (or dwell) anywhere else
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => !bar.current?.contains(e.target as Node) && setMenu(null);
    window.addEventListener("click", off);
    return () => window.removeEventListener("click", off);
  }, [menu]);

  const upload = async (f: File) => {
    setStatus("Loading…");
    const err = await uploadSong(f);
    setStatus(err);
    if (!err) onNavigate("free");
    window.setTimeout(() => setStatus(""), 3000);
  };
  const pick = (id: MenuItem["id"]) => {
    setMenu(null);
    if (id === "upload") input.current?.click();
    else onNavigate(id);
  };

  return (
    <header ref={bar} className="absolute inset-x-0 top-0 z-50 flex h-[76px] items-center gap-4 border-b border-white/10 bg-black/35 px-5 backdrop-blur-md">
      <button onClick={() => onNavigate("home")} className="shrink-0 cursor-pointer text-2xl font-light tracking-tight" data-hand-target="">
        HandJam
      </button>

      <nav aria-label="Main" className="flex flex-1 items-center justify-center gap-2.5">
        {remix ? (
          <>
            <LiquidMetalButton viewMode="icon" label="Home" icon={<Home size={17} />} onClick={() => onNavigate("home")} />
            <LiquidMetalButton label="Library" width={124} icon={<Disc3 size={15} />} onClick={() => onNavigate("library")} />
            <LiquidMetalButton label="Find music" width={146} icon={<Search size={15} />} onClick={() => onNavigate("finder")} />
            <LiquidMetalButton label="Reset sound" width={150} icon={<RotateCcw size={15} />} onClick={onReset} />
            {inSession ? (
              <LiquidMetalButton label="End session" width={150} icon={<Square size={13} />} onClick={onEndSession} />
            ) : (
              <LiquidMetalButton label="Start session" width={160} icon={<Timer size={15} />} onClick={() => onNavigate("session")} />
            )}
          </>
        ) : (
          <>
            <LiquidMetalButton label="Free play" width={140} icon={<Play size={15} />} onClick={() => onNavigate("free")} />
            <LiquidMetalButton label="Session" width={130} icon={<Timer size={15} />} onClick={() => onNavigate("session")} />
            <LiquidMetalButton label="Online" width={124} icon={<Globe size={15} />} onClick={() => onNavigate("online")} />
            <Menu label="Music" open={menu === "music"} onToggle={() => setMenu(menu === "music" ? null : "music")} items={MUSIC} onPick={pick} loading={status === "Loading…"} />
            <Menu label="Rewards" open={menu === "rewards"} onToggle={() => setMenu(menu === "rewards" ? null : "rewards")} items={REWARDS} onPick={pick} />
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
        {status && status !== "Loading…" && <span className="rounded-full bg-red-500/90 px-3 py-1">{status}</span>}
        <button data-hand-target="" onClick={() => onNavigate("market")} className="cursor-pointer rounded-full bg-[#E8FF1F]/15 px-3 py-1.5 text-[#E8FF1F] transition-colors hover:bg-[#E8FF1F]/25" title="Your Cognus balance">
          {profile.cognus.toLocaleString()} Cognus
        </button>
        <button data-hand-target="" onClick={() => onNavigate("account")} className="flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 transition-colors hover:bg-white/20" title={rank.name}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: rank.color }} />
          <span className="hidden max-w-28 truncate sm:inline">{user ? profile.name : "Sign in"}</span>
          {!user && <UserRound size={14} className="sm:hidden" />}
        </button>
        <span className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 xl:flex">
          <span className={`h-2 w-2 rounded-full ${cameraOn ? "animate-pulse bg-red-500" : "bg-white/30"}`} />
          {cameraOn ? "Camera on" : "Camera starting"}
        </span>
      </div>

      <input
        ref={input}
        type="file"
        accept=".mp3,.wav,.flac,.ogg,.m4a,audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
    </header>
  );
}

function Menu({ label, open, onToggle, items, onPick, loading }: { label: string; open: boolean; onToggle: () => void; items: MenuItem[]; onPick: (id: MenuItem["id"]) => void; loading?: boolean }) {
  return (
    <div className="relative">
      <LiquidMetalButton label={loading ? "Loading…" : label} width={128} icon={<ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />} onClick={onToggle} />
      {open && (
        <div role="menu" className="absolute left-1/2 top-[calc(100%+12px)] grid w-56 -translate-x-1/2 gap-1 rounded-3xl border border-white/15 bg-black/80 p-2 shadow-2xl backdrop-blur-xl">
          {items.map((i) => (
            <button
              key={i.id}
              role="menuitem"
              data-hand-target=""
              onClick={() => onPick(i.id)}
              className="flex h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 text-left text-sm transition-colors hover:bg-white/15"
            >
              <span className="text-white/70">{i.icon}</span>
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
