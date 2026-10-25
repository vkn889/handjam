/**
 * Everything you can earn or buy with Cognus: wallpapers, songs, album rows for the home
 * page, free-play HUD themes and name titles. Plus ranks and the season pass.
 */

export type ItemKind = "wallpaper" | "song" | "heroSet" | "theme" | "title";

export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  blurb: string;
  price: number;
  /** wallpaper colours (low → high), theme accents, title text… */
  colors?: [string, string, string, string];
  /** pass-only items can't be bought */
  passOnly?: boolean;
}

export const WALLPAPERS: Item[] = [
  { id: "wp-ocean", kind: "wallpaper", name: "Ocean", blurb: "The original deep-blue waves.", price: 0, colors: ["#031C26", "#1B6CA8", "#5AD2F4", "#EAF9FF"] },
  { id: "wp-sunset", kind: "wallpaper", name: "Sunset", blurb: "Plum dusk melting into peach.", price: 300, colors: ["#1A0B2E", "#7A1F5C", "#F2668B", "#FFE3C4"] },
  { id: "wp-aurora", kind: "wallpaper", name: "Aurora", blurb: "Northern lights over a dark sky.", price: 450, colors: ["#020B14", "#0E5E4E", "#36E0A3", "#E9FFF4"] },
  { id: "wp-neon", kind: "wallpaper", name: "Neon Night", blurb: "Hot pink and electric blue.", price: 600, colors: ["#07001A", "#3D0AA8", "#FF2EB4", "#7CF7FF"] },
  { id: "wp-ember", kind: "wallpaper", name: "Ember", blurb: "Glowing coals and gold.", price: 600, colors: ["#120402", "#6E1408", "#F2701D", "#FFE08A"] },
  { id: "wp-mono", kind: "wallpaper", name: "Mono", blurb: "Silver fog, nothing else.", price: 250, colors: ["#050505", "#2A2A2E", "#8C8C96", "#F2F2F5"] },
  { id: "wp-gold", kind: "wallpaper", name: "Champion Gold", blurb: "Season 1 reward.", price: 0, passOnly: true, colors: ["#0F0A00", "#5C4300", "#E8B923", "#FFF6CF"] },
];

export const SONGS: Item[] = [
  { id: "gen-trap", kind: "song", name: "Trap Bounce", blurb: "Rolling hats and deep 808s.", price: 350 },
  { id: "gen-bossa", kind: "song", name: "Bossa Breeze", blurb: "Lazy nylon-string sunshine.", price: 350 },
  { id: "gen-dnb", kind: "song", name: "Jungle Rush", blurb: "174 BPM drum & bass.", price: 500 },
  { id: "gen-cathedral", kind: "song", name: "Synth Cathedral", blurb: "Huge slow chords.", price: 400 },
  { id: "gen-reggae", kind: "song", name: "Island Skank", blurb: "Off-beat chops and dub bass.", price: 400 },
  { id: "gen-sparkle", kind: "song", name: "Sparkle Pop", blurb: "Bright, bouncy, shiny.", price: 450 },
  { id: "gen-anthem", kind: "song", name: "Victory Anthem", blurb: "Season 1 reward.", price: 0, passOnly: true },
];

export const HERO_SETS: Item[] = [
  { id: "hero-popular", kind: "heroSet", name: "World's Biggest", blurb: "The best-selling albums ever.", price: 0 },
  { id: "hero-mine", kind: "heroSet", name: "Just My Music", blurb: "Only what you play the most.", price: 150 },
  { id: "hero-hiphop", kind: "heroSet", name: "Hip-Hop Icons", blurb: "Classic and modern rap albums.", price: 300 },
  { id: "hero-rock", kind: "heroSet", name: "Rock Legends", blurb: "Guitars, stadiums, leather.", price: 300 },
  { id: "hero-pop", kind: "heroSet", name: "Pop Royalty", blurb: "Chart-topping pop.", price: 300 },
  { id: "hero-80s", kind: "heroSet", name: "Neon '80s", blurb: "Synths and shoulder pads.", price: 300 },
];

export const THEMES: Item[] = [
  { id: "th-classic", kind: "theme", name: "Classic", blurb: "Clean white HUD, blue waveform.", price: 0, colors: ["#FFFFFF", "#4A52FF", "#FFFFFF", "#111111"] },
  { id: "th-neon", kind: "theme", name: "Neon", blurb: "Pink lines, cyan waves.", price: 300, colors: ["#FF4FD8", "#3EF2FF", "#FF4FD8", "#1A0030"] },
  { id: "th-amber", kind: "theme", name: "Retro Amber", blurb: "Old-school VU-meter glow.", price: 300, colors: ["#FFB547", "#FF6B1A", "#FFB547", "#2A1400"] },
  { id: "th-mint", kind: "theme", name: "Mint", blurb: "Fresh green on white.", price: 300, colors: ["#B8FFE0", "#22D39A", "#FFFFFF", "#04261B"] },
  { id: "th-gold", kind: "theme", name: "Champion", blurb: "Season 1 reward.", price: 0, passOnly: true, colors: ["#FFE08A", "#E8B923", "#FFF6CF", "#2B1F00"] },
];

export const TITLES: Item[] = [
  { id: "ti-rookie", kind: "title", name: "Rookie", blurb: "Everyone starts somewhere.", price: 0 },
  { id: "ti-mixer", kind: "title", name: "Mixmaster", blurb: "Shown next to your name.", price: 200 },
  { id: "ti-chaos", kind: "title", name: "Agent of Chaos", blurb: "For the unpredictable.", price: 500 },
  { id: "ti-maestro", kind: "title", name: "Maestro", blurb: "Conducts with ten fingers.", price: 800 },
  { id: "ti-legend", kind: "title", name: "Season 1 Legend", blurb: "Season 1 reward.", price: 0, passOnly: true },
];

export const CATALOG: Item[] = [...WALLPAPERS, ...SONGS, ...HERO_SETS, ...THEMES, ...TITLES];
export const itemById = (id: string) => CATALOG.find((i) => i.id === id);

/** What everyone owns from the start. */
export const STARTER = ["wp-ocean", "hero-popular", "th-classic", "ti-rookie"];
export const DEFAULT_EQUIPPED = { wallpaper: "wp-ocean", heroSet: "hero-popular", theme: "th-classic", title: "ti-rookie" };
export type Equipped = typeof DEFAULT_EQUIPPED;

// ---------------------------------------------------------------- ranks

export const RANKS = [
  { name: "Bronze", at: 0, color: "#C98A5A" },
  { name: "Silver", at: 300, color: "#C7CDD6" },
  { name: "Gold", at: 1200, color: "#F2C14E" },
  { name: "Platinum", at: 3500, color: "#7FE3E0" },
  { name: "Diamond", at: 8000, color: "#8FB8FF" },
  { name: "Legend", at: 20000, color: "#E8FF1F" },
];

export function rankFor(lifetime: number) {
  let i = 0;
  while (i + 1 < RANKS.length && lifetime >= RANKS[i + 1].at) i++;
  const next = RANKS[i + 1];
  return { ...RANKS[i], index: i, next, progress: next ? (lifetime - RANKS[i].at) / (next.at - RANKS[i].at) : 1 };
}

// ---------------------------------------------------------------- season pass

export const SEASON = { id: "s1", name: "Season 1: Waves", endsAt: Date.UTC(2026, 11, 31) };
export const XP_PER_TIER = 150;

export interface Tier {
  tier: number;
  reward: { type: "cognus"; amount: number } | { type: "item"; id: string };
}

/** 30 tiers. Season XP = Cognus earned this season. Rewards alternate bonus Cognus and items. */
export const TIERS: Tier[] = Array.from({ length: 30 }, (_, i) => {
  const tier = i + 1;
  const items: Record<number, string> = {
    5: "wp-sunset", 10: "gen-anthem", 12: "hero-hiphop", 15: "th-gold", 18: "wp-aurora",
    20: "ti-legend", 22: "gen-dnb", 25: "wp-gold", 28: "th-neon", 30: "ti-maestro",
  };
  return items[tier] ? { tier, reward: { type: "item", id: items[tier] } } : { tier, reward: { type: "cognus", amount: 10 + tier * 2 } };
});

export const tierFor = (seasonXp: number) => Math.min(TIERS.length, Math.floor(seasonXp / XP_PER_TIER));

// ---------------------------------------------------------------- daily challenges

export interface Challenge {
  id: string;
  text: string;
  /** checked against a finished session summary */
  check: (s: { cognus: number; combos?: Record<string, number>; bestChain?: number }) => boolean;
  reward: number;
}

const landed = (s: { combos?: Record<string, number> }, id: string) => s.combos?.[id] ?? 0;
const POOL: Challenge[] = [
  { id: "c-drop", text: "Land 3 Bass Drops in one session", check: (s) => landed(s, "drop") >= 3, reward: 20 },
  { id: "c-riser", text: "Land 2 Risers in one session", check: (s) => landed(s, "riser") >= 2, reward: 20 },
  { id: "c-wash", text: "Land a Wash Out", check: (s) => landed(s, "wash") >= 1, reward: 15 },
  { id: "c-stack", text: "Land a Full Stack", check: (s) => landed(s, "stack") >= 1, reward: 40 },
  { id: "c-variety", text: "Land 5 different combos in one session", check: (s) => Object.keys(s.combos ?? {}).length >= 5, reward: 35 },
  { id: "c-chain", text: "Build a 3-combo chain (×1.75)", check: (s) => (s.bestChain ?? 0) >= 3, reward: 30 },
  { id: "c-60", text: "Earn 60 Cognus in a single session", check: (s) => s.cognus >= 60, reward: 25 },
  { id: "c-mirror", text: "Land a Mirror Flip and a Twin Pinch in one session", check: (s) => landed(s, "mirror") >= 1 && landed(s, "twin") >= 1, reward: 30 },
];

/** Three challenges a day, the same for everyone, picked from the date. */
export function dailyChallenges(date = new Date()): Challenge[] {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  const picks: Challenge[] = [];
  let k = day % POOL.length;
  while (picks.length < 3) {
    const c = POOL[k];
    if (!picks.includes(c)) picks.push(c);
    k = (k * 5 + 3) % POOL.length;
  }
  return picks;
}
export const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

// ---------------------------------------------------------------- album rows for the home page

export const HERO_ALBUMS: Record<string, { artist: string; album: string }[]> = {
  "hero-hiphop": [
    { artist: "Kendrick Lamar", album: "good kid, m.A.A.d city" }, { artist: "Kanye West", album: "My Beautiful Dark Twisted Fantasy" },
    { artist: "Drake", album: "Take Care" }, { artist: "Travis Scott", album: "ASTROWORLD" }, { artist: "J. Cole", album: "2014 Forest Hills Drive" },
    { artist: "Eminem", album: "The Marshall Mathers LP" }, { artist: "Lauryn Hill", album: "The Miseducation of Lauryn Hill" },
    { artist: "Tyler, The Creator", album: "IGOR" }, { artist: "Kendrick Lamar", album: "DAMN." }, { artist: "Mac Miller", album: "Swimming" },
  ],
  "hero-rock": [
    { artist: "Queen", album: "A Night at the Opera" }, { artist: "Led Zeppelin", album: "Led Zeppelin IV" }, { artist: "Nirvana", album: "Nevermind" },
    { artist: "AC/DC", album: "Back in Black" }, { artist: "Guns N' Roses", album: "Appetite for Destruction" }, { artist: "Radiohead", album: "OK Computer" },
    { artist: "Arctic Monkeys", album: "AM" }, { artist: "Pink Floyd", album: "The Dark Side of the Moon" }, { artist: "Foo Fighters", album: "The Colour and the Shape" },
    { artist: "The Rolling Stones", album: "Sticky Fingers" },
  ],
  "hero-pop": [
    { artist: "Taylor Swift", album: "1989" }, { artist: "Dua Lipa", album: "Future Nostalgia" }, { artist: "Ariana Grande", album: "thank u, next" },
    { artist: "Billie Eilish", album: "HIT ME HARD AND SOFT" }, { artist: "Olivia Rodrigo", album: "SOUR" }, { artist: "Harry Styles", album: "Harry's House" },
    { artist: "Sabrina Carpenter", album: "Short n' Sweet" }, { artist: "Lady Gaga", album: "The Fame" }, { artist: "Beyoncé", album: "RENAISSANCE" },
    { artist: "Charli xcx", album: "BRAT" },
  ],
  "hero-80s": [
    { artist: "Michael Jackson", album: "Thriller" }, { artist: "Madonna", album: "Like a Virgin" }, { artist: "Prince", album: "Purple Rain" },
    { artist: "Whitney Houston", album: "Whitney Houston" }, { artist: "Bruce Springsteen", album: "Born in the U.S.A." }, { artist: "Duran Duran", album: "Rio" },
    { artist: "Tears for Fears", album: "Songs from the Big Chair" }, { artist: "a-ha", album: "Hunting High and Low" }, { artist: "Cyndi Lauper", album: "She's So Unusual" },
    { artist: "Def Leppard", album: "Hysteria" },
  ],
};
