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
* **Sessions:** two minutes where changing things often, unpredictably and with many controls at
  once earns **Cognus** (cognitive points). Switching songs mid-session scores big. At the end you
  get a dashboard of the session: Cognus, control mix, hand activity, songs, moves per control.
* **Library:** a disc carousel of generated tracks (synthesized in the browser), songs you've
  uploaded before (kept in this browser's IndexedDB) and songs you found.
* **Find music:** type an artist, song or vibe. A Python function searches the iTunes Search API
  (official 30 s previews you can remix, plus related songs) and the Internet Archive (full-length
  Creative Commons / public-domain tracks), and links out to Apple Music, Spotify and YouTube. It
  does not look for unlicensed copies of commercial songs.

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
| `src/lib/session.ts` | Session recording and Cognus scoring |
| `api/index.py` | Python music finder |
| `src/components/ui/*` | shadcn-style UI components (player, liquid metal button, disc carousel, orb, session bento) |
