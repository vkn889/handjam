"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/ui/audio-player";
import { CameraBackdrop } from "@/components/CameraBackdrop";
import { FinderView } from "@/components/FinderView";
import { HandCursor } from "@/components/HandCursor";
import { HandOverlay } from "@/components/HandOverlay";
import { Home } from "@/components/Home";
import { LibraryView } from "@/components/LibraryView";
import { NavBar, type NavTarget } from "@/components/NavBar";
import { Onboarding } from "@/components/Onboarding";
import { ResultsView } from "@/components/ResultsView";
import { TrackCover } from "@/components/TrackCover";
import { currentTrack, endSession, player, startSession, useEngine, useViewport } from "@/lib/engine";
import { totalCognus, type SessionSummary } from "@/lib/session";

type View = "home" | "onboarding" | "remix" | "library" | "finder" | "results";
const SESSION_SECONDS = 120;

export default function Page() {
  const { state } = useEngine();
  const { w, h } = useViewport();
  const [view, setView] = useState<View>("home");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [cognus, setCognus] = useState(0);
  const afterOnboarding = useRef<"free" | "session">("free");
  const camOk = !!state?.camera.ok;
  const inSession = !!state?.session;

  useEffect(() => setCognus(totalCognus()), [view]);

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
    setSummary(endSession());
    setView("results");
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
    // leaving the remix screen mid-session ends the session (picking another song doesn't)
    if (inSession && t !== "library" && t !== "finder") endSession();
    if (t === "stats") {
      setSummary(null);
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
  const sessionSeconds = state?.session?.seconds ?? 0;
  useEffect(() => {
    if (sessionSeconds >= SESSION_SECONDS) finishSession();
  }, [sessionSeconds, finishSession]);

  // Escape goes back home
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || view === "finder") return;
      if (inSession) endSession();
      setView("home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, inSession]);

  const t = state?.track;
  const showCamera = view === "remix" || view === "onboarding" || view === "library" || view === "finder";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black select-none">
      {showCamera && <CameraBackdrop live={false} dim={view === "onboarding" ? 0.2 : 0} />}
      {view === "home" && <Home songTitle={t?.title ?? ""} />}

      {state && camOk && (view === "remix" || view === "onboarding") && <HandOverlay state={state} width={w} height={h} />}

      {state && !camOk && (view === "remix" || view === "onboarding") && (
        <Notice title={state.camera.error ? "Camera needed" : "Starting the camera…"}>
          <p>{state.camera.error || "Allow camera access when your browser asks. Hand tracking runs on this device; nothing is uploaded."}</p>
        </Notice>
      )}

      {state && camOk && view === "onboarding" && <Onboarding state={state} onDone={finishOnboarding} />}
      {view === "library" && <LibraryView currentId={t?.id ?? ""} onPlayed={() => setView("remix")} />}
      {view === "finder" && <FinderView onPlayed={() => setView("remix")} />}
      {view === "results" && (
        <ResultsView
          summary={summary}
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
            </div>
          )}
        </>
      )}

      <NavBar
        view={view}
        cognus={cognus}
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
