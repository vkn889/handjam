# HandJam

Remix music with your hands in front of a webcam.

| Move | Controls |
| --- | --- |
| Right thumb + index | **Pitch** (110–440 Hz) |
| Left thumb + index | **Speed** (0.5x–2x, pitch stays put) |
| Right thumb + middle, stretched apart | **Echo** |
| Left thumb + middle, stretched apart | **Bass** |
| Hands further apart | **Volume** (0–10) |
| Left arm up / down | **Filter** (down = muffled) |
| Right arm up / down | **Reverb** |
| A hand leaves the camera | that hand's settings ease back to normal |
| **Reset sound** button | everything back to normal (held for 1.5 s) |

**Picking things:** point your index finger at a button and hold it there for a second; the ring
fills and it clicks. In the library, flick your pointing finger sideways to swipe between discs.

## Modes

* **Free play:** remix whatever is loaded.
* **Sessions:** two minutes to earn **Cognus**. Cognus only comes from landing **combos**:
  deliberate gesture patterns like Bass Drop, Tape Stop, Riser, Echo Throw, Twin Pinch, Mirror
  Flip, Wash Out, Wobble and Full Stack (the full guide is in Rewards → Season pass). Each combo's
  setup has to be held on purpose, so waving your hands around earns nothing. Repeating a combo pays
  40% less each time; landing a different one within 5 s chains (+25% per link, up to ×2); every
  distinct combo adds a style bonus. At the end you get a dashboard of the session.
* **Library:** a disc carousel of generated tracks (synthesized in the browser), songs you've
  uploaded before (kept in this browser's IndexedDB) and songs you found.
* **Find music:** type an artist, song or vibe. A Python function searches the iTunes Search API
  (official 30 s previews you can remix, plus related songs) and the Internet Archive (full-length
  Creative Commons / public-domain tracks), and links out to Apple Music, Spotify and YouTube. It
  does not look for unlicensed copies of commercial songs.
* **Online:** make a room and share the 5-letter code (up to 6 players). The host picks a song,
  everyone starts on the same server-timed beat and jams for 90 s. You see a live standings board
  and every opponent's hand skeleton streaming in real time. Podium finishes earn bonus Cognus.
* **Playlists:** sets with sections (warm-up / peak / cool-down…) you play straight through.
  Auto-build sorts your library by tempo.

## Progression

* **Account:** email + password, Google, or guest (a guest can later add an email and keep
  everything). Without an account, progress lives in this browser and carries over when you sign in.
* **Ranks:** Bronze → Silver (300) → Gold (1,200) → Platinum (3,500) → Diamond (8,000) → Legend
  (20,000) by lifetime Cognus. A good session earns roughly 30–100.
* **Season pass:** 30 tiers; every Cognus earned this season is pass XP. Tiers unlock bonus Cognus,
  wallpapers, songs, album rows, HUD themes and titles.
* **Daily challenges:** three a day, the same for everyone, for bonus Cognus.
* **Leaderboard:** live top 50 by all-time Cognus, this season, best session or online wins.
* **Market:** spend Cognus on home wallpapers (recolour the waves shader), extra generated songs,
  album rows for the home page, free-play HUD colour themes and name titles. *Customize home*
  sets the album row, its speed, curve and cover size.

## Firebase

Accounts, the leaderboard and online rooms use Firebase Auth + Realtime Database. Everything else
works without it.

1. Create a Firebase project, add a **Web app**, and create a **Realtime Database**.
2. Authentication → Sign-in method: enable **Email/Password**, **Google** and **Anonymous**.
3. Copy the web config into `.env.local` (see `.env.example`), and add the same variables to Vercel.
4. Publish the rules: paste `database.rules.json` into Realtime Database → Rules (or
   `npx firebase-tools deploy --only database`).

To try it locally without a project: `npm run emulators` (needs Java), then use
`NEXT_PUBLIC_FIREBASE_EMULATOR=1` with `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-handjam` and
`NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://127.0.0.1:9000?ns=demo-handjam-default-rtdb`.

The rules keep profiles private, stop anyone writing someone else's scores, cap how much Cognus
one write can add, keep leaderboard rows at or below the stored totals, and let only the host
control a room. Scores are still computed in the browser, so treat the leaderboard as friendly
competition rather than anti-cheat proof.

## Run it

Needs Node and [uv](https://docs.astral.sh/uv/) (for the Python finder).

```bash
npm install
npm run dev        # Next.js on :3000 + the Python finder on :8000
```

Allow camera access, and click once anywhere so the browser allows sound.

## Deploy

Push to a Vercel project or run `vercel`. The web app is static; `api/index.py` deploys as a
Python serverless function (dependencies in `requirements.txt`, routing in `vercel.json`).
Closing the tab stops the audio and the camera.

## How it works

```
webcam ─► MediaPipe HandLandmarker (GPU, in the browser) ─► gestures (EMA-smoothed)
song ─► AudioWorklet: varispeed + grain pitch shifter ─► bass shelf ─► low-pass ─► reverb / echo ─► volume
```

| Path | What |
| --- | --- |
| `src/lib/tracker.ts` | Camera, hand tracking, gesture → control mapping, swipes |
| `src/lib/deck.ts` | Web Audio chain and the player queue |
| `public/deck-worklet.js` | Audio-thread DSP: varispeed + pitch shifter |
| `src/lib/tracks.ts` | Generated music recipes |
| `src/lib/library.ts` | Uploads (IndexedDB), found songs, decoding |
| `src/lib/session.ts` | Session recording |
| `src/lib/combos.ts` | Combo detection and Cognus scoring |
| `src/lib/account.ts` | Auth, profile (balance, pass, inventory, playlists), banking sessions |
| `src/lib/catalog.ts` | Market items, ranks, season pass tiers, daily challenges |
| `src/lib/online.ts` | Online rooms: join codes, synced start, live scores and skeletons |
| `database.rules.json` | Realtime Database security rules |
| `api/index.py` | Python music finder |
| `src/components/ui/*` | shadcn-style UI components (player, liquid metal button, disc carousel, orb, session bento) |
