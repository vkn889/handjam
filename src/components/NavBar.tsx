"use client";

import { useRef, useState } from "react";
import { BarChart3, Disc3, Home, Play, RotateCcw, Search, Square, Timer, Upload } from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { uploadSong } from "@/lib/engine";

export type NavTarget = "home" | "free" | "session" | "library" | "finder" | "stats";

/**
 * One bar at the top for everything. On the remix screen it swaps to remix tools
 * (reset, end session) so the camera view stays clear.
 */
export function NavBar({
  view,
  cognus,
  cameraOn,
  inSession,
  onNavigate,
  onReset,
  onEndSession,
}: {
  view: string;
  cognus: number;
  cameraOn: boolean;
  inSession: boolean;
  onNavigate: (t: NavTarget) => void;
  onReset: () => void;
  onEndSession: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const remix = view === "remix";

  const upload = async (f: File) => {
    setStatus("Loading…");
    const err = await uploadSong(f);
    setStatus(err);
    if (!err) onNavigate("free");
    window.setTimeout(() => setStatus(""), 3000);
  };

  return (
    <header className="absolute inset-x-0 top-0 z-50 flex h-[76px] items-center gap-4 border-b border-white/10 bg-black/35 px-5 backdrop-blur-md">
      <button onClick={() => onNavigate("home")} className="flex shrink-0 cursor-pointer items-baseline gap-3 text-left" data-hand-target="">
        <span className="text-2xl font-light tracking-tight">HandJam</span>
        {cognus > 0 && <span className="hidden text-xs font-semibold text-[#E8FF1F] lg:inline">{cognus.toLocaleString()} Cognus</span>}
      </button>

      <nav aria-label="Main" className="flex flex-1 items-center justify-center gap-2.5 overflow-x-auto">
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
            <LiquidMetalButton label="Library" width={124} icon={<Disc3 size={15} />} onClick={() => onNavigate("library")} />
            <LiquidMetalButton label="Find music" width={146} icon={<Search size={15} />} onClick={() => onNavigate("finder")} />
            <LiquidMetalButton label={status === "Loading…" ? "Loading…" : "Upload"} width={124} icon={<Upload size={15} />} onClick={() => input.current?.click()} />
            <LiquidMetalButton label="Stats" width={112} icon={<BarChart3 size={15} />} onClick={() => onNavigate("stats")} />
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
        {status && status !== "Loading…" && <span className="rounded-full bg-red-500/90 px-3 py-1">{status}</span>}
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
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
