"""HandJam music finder (Python serverless function on Vercel).

GET /api/py/search?q=daft+punk

Looks the query up in two legal sources and scrapes what it needs from each:

* iTunes Search API: matching songs with their official 30-second preview (playable and
  remixable in HandJam), plus "related" songs by the same artist and in the same genre.
* Internet Archive: full-length recordings that are Creative Commons licensed or public
  domain. The search API finds items; each item's metadata is then scraped for an MP3 file.

Every result also carries "listen on" links (Apple Music, Spotify, YouTube searches).
It deliberately does not hunt for unlicensed copies of commercial songs.

Local dev: npm run dev starts this on :8000 next to Next.js (see next.config.ts rewrites).
"""

from __future__ import annotations

import json
import ssl
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import certifi
from fastapi import FastAPI, HTTPException, Query

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

UA = {"User-Agent": "HandJam/1.0 (music finder)"}
TIMEOUT = 8
SSL = ssl.create_default_context(cafile=certifi.where())


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def listen_links(title: str, artist: str, apple: str | None = None) -> dict:
    q = urllib.parse.quote_plus(f"{title} {artist}".strip())
    links = {
        "spotify": f"https://open.spotify.com/search/{urllib.parse.quote(f'{title} {artist}'.strip())}",
        "youtube": f"https://www.youtube.com/results?search_query={q}",
    }
    if apple:
        links["apple"] = apple
    return links


def itunes_song(r: dict) -> dict | None:
    if not r.get("previewUrl"):
        return None
    art = (r.get("artworkUrl100") or "").replace("100x100bb", "600x600bb")
    return {
        "id": f"it-{r.get('trackId')}",
        "title": r.get("trackName", ""),
        "artist": r.get("artistName", ""),
        "album": r.get("collectionName", ""),
        "genre": r.get("primaryGenreName", ""),
        "year": (r.get("releaseDate") or "")[:4],
        "art": art,
        "audio": r["previewUrl"],
        "kind": "30s preview",
        "source": "iTunes",
        "links": listen_links(r.get("trackName", ""), r.get("artistName", ""), r.get("trackViewUrl")),
    }


def itunes_search(term: str, limit: int = 12) -> list[dict]:
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode({"term": term, "media": "music", "entity": "song", "limit": limit})
    return [s for s in (itunes_song(r) for r in get_json(url).get("results", [])) if s]


def itunes_artist_songs(artist_id: int, limit: int = 10) -> list[dict]:
    url = "https://itunes.apple.com/lookup?" + urllib.parse.urlencode({"id": artist_id, "entity": "song", "limit": limit})
    return [s for s in (itunes_song(r) for r in get_json(url).get("results", []) if r.get("wrapperType") == "track") if s]


def archive_mp3(identifier: str) -> str | None:
    """Scrape an Internet Archive item's file list for a reasonably sized MP3."""
    try:
        meta = get_json(f"https://archive.org/metadata/{urllib.parse.quote(identifier)}")
    except Exception:
        return None
    files = [f for f in meta.get("files", []) if str(f.get("name", "")).lower().endswith(".mp3")]
    files = [f for f in files if int(f.get("size") or 0) < 25_000_000] or files
    if not files:
        return None
    best = min(files, key=lambda f: abs(int(f.get("size") or 0) - 6_000_000))
    return f"https://archive.org/download/{urllib.parse.quote(identifier)}/{urllib.parse.quote(best['name'])}"


def archive_search(term: str, rows: int = 6) -> list[dict]:
    q = (
        f"({' AND '.join(f'(title:({w}) OR creator:({w}) OR subject:({w}))' for w in term.split()[:4])})"
        " AND mediatype:audio AND (licenseurl:*creativecommons* OR licenseurl:*publicdomain*)"
    )
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
        [("q", q), ("fl[]", "identifier"), ("fl[]", "title"), ("fl[]", "creator"), ("fl[]", "licenseurl"), ("fl[]", "year"),
         ("rows", rows), ("sort[]", "downloads desc"), ("output", "json")]
    )
    docs = get_json(url).get("response", {}).get("docs", [])
    with ThreadPoolExecutor(max_workers=6) as pool:
        mp3s = list(pool.map(lambda d: archive_mp3(d["identifier"]), docs))
    out = []
    for d, mp3 in zip(docs, mp3s):
        if not mp3:
            continue
        creator = d.get("creator")
        creator = ", ".join(creator) if isinstance(creator, list) else (creator or "Unknown artist")
        title = d.get("title") or d["identifier"]
        out.append({
            "id": f"ia-{d['identifier']}",
            "title": title if isinstance(title, str) else title[0],
            "artist": creator,
            "album": "",
            "genre": "",
            "year": str(d.get("year") or ""),
            "art": f"https://archive.org/services/img/{urllib.parse.quote(d['identifier'])}",
            "audio": mp3,
            "kind": "full track · " + ("public domain" if "publicdomain" in str(d.get("licenseurl")) else "Creative Commons"),
            "source": "Internet Archive",
            "license": d.get("licenseurl"),
            "page": f"https://archive.org/details/{urllib.parse.quote(d['identifier'])}",
            "links": listen_links(title if isinstance(title, str) else title[0], creator),
        })
    return out


@app.get("/api/py/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/py/search")
def search(q: str = Query(..., min_length=1, max_length=120)) -> dict:
    term = " ".join(q.split())
    with ThreadPoolExecutor(max_workers=3) as pool:
        songs_f = pool.submit(itunes_search, term)
        free_f = pool.submit(archive_search, term)
        try:
            songs = songs_f.result()
        except Exception:
            songs = []
        try:
            free = free_f.result()
        except Exception:
            free = []

    related: list[dict] = []
    if songs:
        seen = {s["id"] for s in songs}
        try:
            first = get_json("https://itunes.apple.com/search?" + urllib.parse.urlencode({"term": term, "media": "music", "entity": "song", "limit": 1}))
            artist_id = first["results"][0].get("artistId") if first.get("results") else None
            genre = songs[0]["genre"]
            with ThreadPoolExecutor(max_workers=2) as pool:
                by_artist = pool.submit(itunes_artist_songs, artist_id) if artist_id else None
                by_genre = pool.submit(itunes_search, genre, 10) if genre else None
                pool_results = (by_artist.result() if by_artist else []) + (by_genre.result() if by_genre else [])
            for s in pool_results:
                if s["id"] not in seen:
                    seen.add(s["id"])
                    related.append(s)
        except Exception:
            pass

    if not songs and not free:
        raise HTTPException(404, f"Nothing found for “{term}”.")

    parts = []
    if songs:
        parts.append(f"{len(songs)} songs with previews")
    if free:
        parts.append(f"{len(free)} free full tracks")
    if related:
        parts.append(f"{min(len(related), 12)} related picks")
    summary = f"For “{term}”: " + ", ".join(parts) + "."
    return {"query": term, "summary": summary, "songs": songs[:12], "free": free, "related": related[:12]}
