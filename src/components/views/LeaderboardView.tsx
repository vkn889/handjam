"use client";

import { useEffect, useState } from "react";
import { limitToLast, onValue, orderByChild, query, ref } from "firebase/database";
import { Crown } from "lucide-react";
import { Card, Panel, Tabs } from "@/components/ui/pill";
import { useAccount } from "@/lib/account";
import { rankFor } from "@/lib/catalog";
import { fb } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type Board = "lifetime" | "seasonXp" | "best" | "wins";
const BOARDS: { id: Board; label: string; unit: string }[] = [
  { id: "lifetime", label: "All-time Cognus", unit: "Cognus" },
  { id: "seasonXp", label: "This season", unit: "XP" },
  { id: "best", label: "Best session", unit: "Cognus" },
  { id: "wins", label: "Online wins", unit: "wins" },
];

interface Row {
  uid: string;
  name: string;
  title?: string;
  lifetime: number;
  seasonXp: number;
  best: number;
  wins: number;
}

/** The top 50 players, updating live as anyone banks a session. */
export function LeaderboardView() {
  const { user, profile } = useAccount();
  const [board, setBoard] = useState<Board>("lifetime");
  const [rows, setRows] = useState<Row[] | null>(null);
  const f = fb();

  useEffect(() => {
    if (!f) return;
    setRows(null);
    return onValue(
      query(ref(f.db, "leaderboard"), orderByChild(board), limitToLast(50)),
      (snap) => {
        const out: Row[] = [];
        snap.forEach((c) => void out.push({ uid: c.key!, ...c.val() }));
        setRows(out.reverse());
      },
      () => setRows([]),
    );
  }, [f, board]);

  const unit = BOARDS.find((b) => b.id === board)!.unit;
  const local: Row = { uid: "you", name: profile.name, lifetime: profile.lifetime, seasonXp: profile.season.xp, best: profile.best, wins: profile.wins };
  const list = f ? rows : [local];
  const mine = list?.findIndex((r) => r.uid === (user?.uid ?? "you")) ?? -1;

  return (
    <Panel
      title="Leaderboard"
      subtitle={
        f
          ? user
            ? mine >= 0
              ? `You're #${mine + 1}. It updates live.`
              : "Bank a session to appear here. It updates live."
            : "Sign in to put your name on the board."
          : "Only you, for now: add Firebase to compete with everyone."
      }
      actions={<Tabs value={board} onChange={setBoard} options={BOARDS} />}
    >
      <Card className="p-2 sm:p-3">
        {!list ? (
          <p className="p-6 text-center text-white/60">Loading…</p>
        ) : !list.length ? (
          <p className="p-6 text-center text-white/60">Nobody here yet. Be the first.</p>
        ) : (
          <ol>
            {list.map((r, i) => {
              const rank = rankFor(r.lifetime);
              const isMe = i === mine;
              return (
                <li key={r.uid} className={cn("flex items-center gap-4 rounded-2xl px-4 py-3", isMe ? "bg-[#E8FF1F]/15" : i % 2 ? "bg-white/[0.02]" : "")}>
                  <span className={cn("w-8 text-center text-lg font-light", i < 3 ? "text-[#E8FF1F]" : "text-white/50")}>
                    {i === 0 ? <Crown size={20} className="mx-auto" /> : i + 1}
                  </span>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: rank.color }} title={rank.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.name}{isMe && " (you)"}</span>
                    <span className="block truncate text-xs text-white/50">{rank.name}{r.title ? ` · ${r.title}` : ""}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-light tabular-nums">{(r[board] ?? 0).toLocaleString()}</span>
                    <span className="block text-[11px] text-white/45">{unit}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </Panel>
  );
}
