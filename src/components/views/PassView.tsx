"use client";

import { useState } from "react";
import { Check, Gift, Lock, Sparkles } from "lucide-react";
import { Bar, Card, Panel, Pill } from "@/components/ui/pill";
import { claimTier, useAccount } from "@/lib/account";
import { dailyChallenges, itemById, rankFor, RANKS, SEASON, TIERS, tierFor, XP_PER_TIER, type Tier } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const KIND_LABEL = { wallpaper: "Wallpaper", song: "Song", heroSet: "Album row", theme: "HUD theme", title: "Title" } as const;

/** Season pass (30 tiers, earned by playing), your rank, and today's challenges. */
export function PassView() {
  const { profile } = useAccount();
  const [msg, setMsg] = useState("");
  const xp = profile.season.xp;
  const tier = tierFor(xp);
  const into = tier >= TIERS.length ? 1 : (xp % XP_PER_TIER) / XP_PER_TIER;
  const rank = rankFor(profile.lifetime);
  const days = Math.max(0, Math.ceil((SEASON.endsAt - Date.now()) / 86400000));
  const unclaimed = TIERS.filter((t) => t.tier <= tier && !profile.season.claimed[t.tier]);

  const claim = async (t: Tier) => setMsg(await claimTier(t.tier));
  const claimAll = async () => {
    for (const t of unclaimed) await claimTier(t.tier);
    setMsg("");
  };

  return (
    <Panel
      wide
      title={SEASON.name}
      subtitle={`Every Cognus you earn this season is pass XP · ${days} days left`}
      actions={unclaimed.length > 1 && <Pill tone="accent" onClick={() => void claimAll()}><Gift size={15} /> Claim all ({unclaimed.length})</Pill>}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Tier</p>
            <p className="text-sm text-white/60">{xp.toLocaleString()} XP</p>
          </div>
          <p className="mt-1 text-5xl font-light">
            {tier}<span className="text-2xl text-white/40"> / {TIERS.length}</span>
          </p>
          <Bar value={into} className="mt-4" />
          <p className="mt-2 text-xs text-white/55">{tier >= TIERS.length ? "Pass complete!" : `${Math.ceil((1 - into) * XP_PER_TIER)} XP to tier ${tier + 1}`}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Rank · lifetime Cognus</p>
          <p className="mt-1 text-4xl font-light" style={{ color: rank.color }}>{rank.name}</p>
          <Bar value={rank.progress} color={rank.color} className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {RANKS.map((r, i) => (
              <span key={r.name} className={cn("rounded-full px-2.5 py-1 text-[11px]", i <= rank.index ? "text-black" : "bg-white/5 text-white/40")} style={i <= rank.index ? { background: r.color } : undefined}>
                {r.name} {r.at ? `${r.at / 1000}k` : ""}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {msg && <p role="status" className="mt-4 text-sm text-red-300">{msg}</p>}

      {/* the track of 30 tiers */}
      <div className="mt-5 overflow-x-auto pb-3">
        <ol className="flex gap-3">
          {TIERS.map((t) => {
            const reached = t.tier <= tier;
            const claimed = !!profile.season.claimed[t.tier];
            const item = t.reward.type === "item" ? itemById(t.reward.id) : null;
            return (
              <li
                key={t.tier}
                className={cn(
                  "flex w-[150px] shrink-0 flex-col rounded-3xl border p-4",
                  item ? "border-[#E8FF1F]/40 bg-[#E8FF1F]/[0.06]" : "border-white/10 bg-white/[0.04]",
                  !reached && "opacity-55",
                )}
              >
                <span className="text-xs font-semibold text-white/50">TIER {t.tier}</span>
                <span className="mt-3 flex h-12 items-center">
                  {item?.colors ? (
                    <span className="h-10 w-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${item.colors.join(",")})` }} />
                  ) : item ? (
                    <Sparkles className="text-[#E8FF1F]" />
                  ) : (
                    <span className="text-2xl font-light text-[#E8FF1F]">+{t.reward.type === "cognus" ? t.reward.amount : 0}</span>
                  )}
                </span>
                <span className="mt-1 min-h-10 text-sm leading-tight">{item ? item.name : "Cognus"}</span>
                <span className="text-[11px] text-white/45">{item ? KIND_LABEL[item.kind] : "Bonus"}</span>
                <div className="mt-3">
                  {claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-white/60"><Check size={14} /> Claimed</span>
                  ) : reached ? (
                    <Pill size="sm" tone="accent" onClick={() => void claim(t)}>Claim</Pill>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-white/45"><Lock size={13} /> {(t.tier * XP_PER_TIER - xp).toLocaleString()} XP</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <h2 className="mt-6 text-xl font-light">Today&apos;s challenges</h2>
      <p className="text-sm text-white/55">Same three for everyone, new ones at midnight UTC. Finish them in a session for bonus Cognus.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {dailyChallenges().map((c) => {
          const done = !!profile.daily.done[c.id];
          return (
            <Card key={c.id} className={cn("flex items-center justify-between gap-3", done && "border-[#E8FF1F]/40")}>
              <span className="text-sm">{c.text}</span>
              <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", done ? "bg-[#E8FF1F] text-black" : "bg-white/10 text-[#E8FF1F]")}>
                {done ? "Done" : `+${c.reward}`}
              </span>
            </Card>
          );
        })}
      </div>
    </Panel>
  );
}
