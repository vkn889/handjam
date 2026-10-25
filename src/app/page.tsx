"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/ui/audio-player";
import { CameraBackdrop } from "@/components/CameraBackdrop";
import { ComboToast } from "@/components/ComboToast";
import { FinderView } from "@/components/FinderView";
import { HandCursor } from "@/components/HandCursor";
import { HandOverlay } from "@/components/HandOverlay";
import { Home } from "@/components/Home";
import { LibraryView } from "@/components/LibraryView";
import { NavBar, type NavTarget } from "@/components/NavBar";
import { Onboarding } from "@/components/Onboarding";
import { ResultsView } from "@/components/ResultsView";
import { TrackCover } from "@/components/TrackCover";
import { AccountView } from "@/components/views/AccountView";
import { LeaderboardView } from "@/components/views/LeaderboardView";
import { MarketView } from "@/components/views/MarketView";
import { OnlineView } from "@/components/views/OnlineView";
import { PassView } from "@/components/views/PassView";
import { PlaylistsView } from "@/components/views/PlaylistsView";
import { bankSession, useAccount, type Award } from "@/lib/account";
import { itemById } from "@/lib/catalog";
import { currentTrack, endSession, player, startSession, useEngine, useViewport } from "@/lib/engine";
import { useRoom } from "@/lib/online";
import type { SessionSummary } from "@/lib/session";

type View =
  | "home" | "onboarding" | "remix" | "library" | "finder" | "results"
  | "online" | "playlists" | "pass" | "leaderboard" | "market" | "account";
const SESSION_SECONDS = 120;

export default function Page() {
  const { state } = useEngine();
  const { w, h } = useViewport();
  const [view, setView] = useState<View>("home");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const afterOnboarding = useRef<"free" | "session">("free");
  const { profile } = useAccount();
  const room = useRoom();
  const camOk = !!state?.camera.ok;
  const inSession = !!state?.session;
  const inMatch = view === "online" && (room.meta?.status === "countdown" || room.meta?.status === "playing");
  const theme = itemById(profile.equipped.theme)?.colors;

  const onboarded = () => {
    try {
      return localStorage.getItem("handjam-onboarded") === "1";
    } catch {
      return false;
    }
  };

  const begin = useCallback((mode: "free" | "session") => {
    if (mode === "session") startSession();
    else player.play();
    setView("remix");
  }, []);

  const finishSession = useCallback(() => {
    const s = endSession();
    setSummary(s);
    setAward(null);
    setView("results");
    // Bank it: balance, lifetime (rank), season pass XP, daily challenges.
    if (s) void bankSession(s).then(setAward);
  }, []);

  const navigate = (t: NavTarget) => {
    if (t === "free" || t === "session") {
      if (!onboarded()) {
        afterOnboarding.current = t;
        player.play();
        setView("onboarding");
      } else begin(t);
      return;
    }
    // leaving the remix screen mid-session ends (and banks) it; picking another song doesn't
    if (inSession && !inMatch && t !== "library" && t !== "finder") {
      finishSession();
      return;
    }
    if (t === "stats") {
      setSummary(null);
      setAward(null);
      setView("results");
    } else setView(t);
  };

  const finishOnboarding = useCallback(() => {
    try {
      localStorage.setItem("handjam-onboarded", "1");
    } catch {
      /* private mode */
    }
    begin(afterOnboarding.current);
  }, [begin]);

  // sessions end on their own after two minutes
  // (online matches run their own clock)
  const sessionSeconds = state?.session?.seconds ?? 0;
  useEffect(() => {
    if (view !== "online" && sessionSeconds >= SESSION_SECONDS) finishSession();
  }, [view, sessionSeconds, finishSession]);

  // Escape goes back home
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || view === "finder" || inMatch) return;
      if (inSession) endSession();
      setView("home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, inSession, inMatch]);

  const t = state?.track;
  const showCamera = view === "remix" || view === "onboarding" || view === "library" || view === "finder" || inMatch;
  const showHud = view === "remix" || view === "onboarding" || inMatch;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black select-none">
      {showCamera && <CameraBackdrop live={false} dim={view === "onboarding" ? 0.2 : 0} />}
      {view === "home" && <Home songTitle={t?.title ?? ""} />}

      {state && camOk && showHud && <HandOverlay state={state} width={w} height={h} theme={theme} />}

      {state && !camOk && showHud && (
        <Notice title={state.camera.error ? "Camera needed" : "Starting the camera…"}>
          <p>{state.camera.error || "Allow camera access when your browser asks. Hand tracking runs on this device; nothing is uploaded."}</p>
        </Notice>
      )}

      {state && camOk && view === "onboarding" && <Onboarding state={state} onDone={finishOnboarding} />}
      {view === "library" && <LibraryView currentId={t?.id ?? ""} onPlayed={() => setView("remix")} />}
      {view === "finder" && <FinderView onPlayed={() => setView("remix")} />}
      {view === "online" && <OnlineView />}
      {view === "playlists" && <PlaylistsView onPlayed={() => setView("remix")} />}
      {view === "pass" && <PassView />}
      {view === "leaderboard" && <LeaderboardView />}
      {view === "market" && <MarketView onPreviewHome={() => setView("home")} />}
      {view === "account" && <AccountView />}
      {view === "results" && (
        <ResultsView
          summary={summary}
          award={award}
          onAgain={() => {
            startSession();
            setView("remix");
          }}
        />
      )}

      {state && t && view === "remix" && (
        <>
          {/* the player sits bottom-centre so the side meters stay visible */}
          <div className="absolute bottom-5 left-1/2 z-40 -translate-x-1/2">
            <AudioPlayer
              title={t.title}
              subtitle={t.error || currentTrack()?.subtitle}
              cover={<TrackCover track={currentTrack()} />}
              isPlaying={t.playing}
              loading={t.loading}
              currentTime={t.position}
              duration={t.duration}
              shuffle={t.shuffle}
              repeat={t.repeat}
              onToggle={player.toggle}
              onSeek={player.seek}
              onPrev={player.prev}
              onNext={player.next}
              onShuffle={player.setShuffle}
              onRepeat={player.setRepeat}
            />
          </div>
          {state.session && (
            <div className="absolute left-1/2 top-[30%] z-30 -translate-x-1/2 text-center">
              <p className="hud-text text-xs font-semibold tracking-[0.3em] text-white/70">SESSION · {Math.max(0, Math.ceil(SESSION_SECONDS - state.session.seconds))}s</p>
              <p className="hud-text text-3xl font-light">
                <span className="text-[#E8FF1F]">{state.session.cognus}</span> Cognus
              </p>
              <ComboToast session={state.session} />
            </div>
          )}
        </>
      )}

      <NavBar
        view={view}
        cameraOn={camOk}
        inSession={inSession}
        onNavigate={navigate}
        onReset={player.reset}
        onEndSession={finishSession}
      />

      {camOk && <HandCursor />}
    </main>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    // A banner, not a wall: the buttons underneath stay usable with a mouse.
    <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center p-4">
      <div className="pointer-events-auto max-w-md rounded-3xl border border-white/15 bg-black/50 px-6 py-4 text-center backdrop-blur-md">
        <h1 className="text-lg font-medium tracking-wide">{title}</h1>
        <div className="mt-1 text-sm text-white/80">{children}</div>
      </div>
    </div>
  );
}
