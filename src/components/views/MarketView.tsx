"use client";

import { useRef, useState } from "react";
import { Check, Lock, ShoppingBag } from "lucide-react";
import heroSets from "@/data/hero-sets.json";
import popular from "@/data/popular-albums.json";
import { Card, Panel, Pill, Tabs } from "@/components/ui/pill";
import { buy, DEFAULT_HERO, equip, setHero, useAccount } from "@/lib/account";
import { HERO_SETS, SONGS, THEMES, TITLES, WALLPAPERS, type Item } from "@/lib/catalog";
import { coverFor } from "@/lib/library";
import { PREMIUM_RECIPES } from "@/lib/tracks";
import { cn } from "@/lib/utils";

type Tab = "wallpaper" | "song" | "heroSet" | "theme" | "title" | "customize";
const TABS: { id: Tab; label: string }[] = [
  { id: "wallpaper", label: "Wallpapers" },
  { id: "song", label: "Songs" },
  { id: "heroSet", label: "Album rows" },
  { id: "theme", label: "HUD themes" },
  { id: "title", label: "Titles" },
  { id: "customize", label: "Customize home" },
];
const ITEMS: Record<Exclude<Tab, "customize">, Item[]> = { wallpaper: WALLPAPERS, song: SONGS, heroSet: HERO_SETS, theme: THEMES, title: TITLES };
const SETS = heroSets as Record<string, { src: string; alt: string }[]>;

/** Spend Cognus on wallpapers, songs, album rows for the home page, HUD themes and titles. */
export function MarketView({ onPreviewHome }: { onPreviewHome: () => void }) {
  const { profile } = useAccount();
  const [tab, setTab] = useState<Tab>("wallpaper");
  const [msg, setMsg] = useState("");

  return (
    <Panel
      wide
      title="Market"
      subtitle={<>You have <span className="font-semibold text-[#E8FF1F]">{profile.cognus.toLocaleString()} Cognus</span> to spend. Season rewards come from the pass.</>}
      actions={<Tabs value={tab} onChange={(t) => (setTab(t), setMsg(""))} options={TABS} />}
    >
      {msg && <p role="status" className="mb-4 text-sm text-red-300">{msg}</p>}
      {tab === "customize" ? (
        <Customize onPreview={onPreviewHome} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ITEMS[tab].map((item) => {
            const owned = !!profile.inventory[item.id];
            const equipped = Object.values(profile.equipped).includes(item.id);
            return (
              <Card key={item.id} className={cn("flex flex-col p-4", equipped && "border-[#E8FF1F]/50")}>
                <Preview item={item} />
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-white/55">{item.blurb}</p>
                  </div>
                  {!owned && !item.passOnly && <span className="shrink-0 text-sm font-semibold text-[#E8FF1F]">{item.price}</span>}
                </div>
                <div className="mt-4">
                  {item.kind === "song" && owned ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-white/70"><Check size={15} /> In your library</span>
                  ) : equipped ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#E8FF1F]"><Check size={15} /> Equipped</span>
                  ) : owned ? (
                    <Pill size="sm" onClick={() => void equip(item.kind, item.id)}>Equip</Pill>
                  ) : item.passOnly ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/50"><Lock size={13} /> Season pass reward</span>
                  ) : (
                    <Pill size="sm" tone="accent" disabled={profile.cognus < item.price} onClick={() => void buy(item.id).then(setMsg)}>
                      <ShoppingBag size={14} /> {profile.cognus < item.price ? `Need ${item.price - profile.cognus} more` : "Buy"}
                    </Pill>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function Preview({ item }: { item: Item }) {
  const box = "aspect-[16/10] w-full overflow-hidden rounded-2xl";
  if (item.kind === "wallpaper" && item.colors)
    return <div className={box} style={{ background: `radial-gradient(120% 90% at 30% 110%, ${item.colors[2]}, transparent 60%), linear-gradient(160deg, ${item.colors[0]}, ${item.colors[1]} 60%, ${item.colors[3]})` }} />;
  if (item.kind === "theme" && item.colors) {
    const [line, wave, , track] = item.colors;
    return (
      <svg viewBox="0 0 160 100" className={cn(box, "bg-neutral-800")} aria-hidden>
        <line x1="30" y1="60" x2="130" y2="60" stroke={line} strokeWidth="2" strokeDasharray="4 4" />
        {Array.from({ length: 18 }, (_, i) => (
          <line key={i} x1={36 + i * 5} x2={36 + i * 5} y1={60 - 4 - ((i * 7) % 13)} y2={60 + 4 + ((i * 7) % 13)} stroke={wave} strokeWidth="3" strokeLinecap="round" />
        ))}
        <circle cx="30" cy="60" r="8" fill="none" stroke={line} strokeWidth="2" />
        <circle cx="130" cy="60" r="8" fill="none" stroke={line} strokeWidth="2" />
        <rect x="55" y="16" width="50" height="6" fill={track} />
        <rect x="55" y="16" width="32" height="6" fill={line} />
      </svg>
    );
  }
  if (item.kind === "song") {
    const r = PREMIUM_RECIPES.find((x) => x.id === item.id);
    if (r)
      // eslint-disable-next-line @next/next/no-img-element
      return <img alt="" className={cn(box, "object-cover")} src={coverFor({ id: r.id, kind: "generated", title: r.title, subtitle: r.mood, recipe: r })} />;
  }
  if (item.kind === "heroSet") {
    const covers = item.id === "hero-popular" ? (popular as { src: string }[]) : SETS[item.id] ?? [];
    return (
      <div className={cn(box, "grid grid-cols-3 gap-1 bg-neutral-900 p-1")}>
        {item.id === "hero-mine" ? (
          <div className="col-span-3 grid place-items-center text-sm text-white/60">Your most played songs</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          covers.slice(0, 6).map((c) => <img key={c.src} alt="" src={c.src} className="h-full w-full rounded-md object-cover" loading="lazy" />)
        )}
      </div>
    );
  }
  return (
    <div className={cn(box, "grid place-items-center bg-gradient-to-br from-white/10 to-white/[0.02]")}>
      <span className="text-sm text-white/60">Player</span>
      <span className="-mt-8 text-lg font-medium text-[#E8FF1F]">{item.name}</span>
    </div>
  );
}

function Customize({ onPreview }: { onPreview: () => void }) {
  const { profile } = useAccount();
  const h = profile.hero;
  const ownedSets = HERO_SETS.filter((s) => profile.inventory[s.id]);
  const ownedWalls = WALLPAPERS.filter((s) => profile.inventory[s.id]);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <p className="font-medium">Album row</p>
        <p className="text-xs text-white/55">Which covers curve across your home page. Buy more rows in the market.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ownedSets.map((s) => (
            <Pill key={s.id} size="sm" tone={profile.equipped.heroSet === s.id ? "solid" : "glass"} onClick={() => void equip("heroSet", s.id)}>{s.name}</Pill>
          ))}
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm" data-hand-target="">
          <input type="checkbox" className="h-5 w-5 accent-[#E8FF1F]" checked={h.includeMine} onChange={(e) => void setHero({ includeMine: e.target.checked })} />
          Mix in the songs I play most
        </label>
        <p className="mt-6 font-medium">Wallpaper</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ownedWalls.map((w) => (
            <button
              key={w.id}
              data-hand-target=""
              aria-label={w.name}
              onClick={() => void equip("wallpaper", w.id)}
              className={cn("h-12 w-16 cursor-pointer rounded-xl border-2", profile.equipped.wallpaper === w.id ? "border-white" : "border-transparent")}
              style={{ background: `linear-gradient(135deg, ${w.colors!.join(",")})` }}
            />
          ))}
        </div>
      </Card>
      <Card>
        <Slider key={`s${h.speed}`} label="Scroll speed" hint="seconds per cover" min={1.5} max={9} step={0.5} value={h.speed} onChange={(speed) => void setHero({ speed })} />
        <Slider key={`c${h.curve}`} label="Curve" hint="degrees" min={20} max={85} step={1} value={h.curve} onChange={(curve) => void setHero({ curve })} />
        <Slider key={`t${h.tileHeight}`} label="Cover size" hint="% of screen height" min={18} max={44} step={1} value={h.tileHeight} onChange={(tileHeight) => void setHero({ tileHeight })} />
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill tone="solid" onClick={onPreview}>See it on the home page</Pill>
          <Pill onClick={() => void setHero(DEFAULT_HERO)}>Reset</Pill>
        </div>
      </Card>
    </div>
  );
}

function Slider({ label, hint, min, max, step, value, onChange }: { label: string; hint: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  // Show the drag instantly; save once it settles (each save is a database write).
  // The parent re-keys the slider when the saved value changes, which resets this.
  const [local, setLocal] = useState(value);
  const timer = useRef(0);
  const change = (v: number) => {
    setLocal(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onChange(v), 300);
  };
  return (
    <label className="mt-4 block first:mt-0">
      <span className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-white/60">{local} <span className="text-xs">{hint}</span></span>
      </span>
      <input type="range" min={min} max={max} step={step} value={local} onChange={(e) => change(Number(e.target.value))} className="mt-2 w-full accent-[#E8FF1F]" />
    </label>
  );
}
