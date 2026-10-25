import type { Metadata } from "next";
import Link from "next/link";
import { SeoPage } from "@/components/SeoPage";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to Play: Remix Music With Hand Gestures",
  description:
    "Learn every HandJam gesture: pinch for pitch and speed, stretch your middle fingers for bass and echo, spread your hands for volume, raise and lower your arms for reverb and filter. Plus sessions, Cognus and online battles.",
  alternates: { canonical: "/how-to-play" },
};

const FAQ = [
  { q: "Do I need to download anything to play HandJam?", a: "No. HandJam runs entirely in your web browser. You only need a webcam and a modern browser such as Chrome, Edge, Safari or Firefox." },
  { q: "Is my camera video uploaded?", a: "No. Hand tracking runs on your own device with MediaPipe. The video never leaves your computer." },
  { q: "Is HandJam free?", a: "Yes, HandJam is completely free to play, including online multiplayer battles." },
  { q: "Can I remix my own songs?", a: "Yes. Upload any MP3, WAV, M4A, OGG or FLAC file and remix it with your hands. Uploads stay in your browser." },
  { q: "How do I earn Cognus?", a: "Cognus is earned by landing combos, deliberate gesture patterns like the Bass Drop, Riser and Full Stack. Chaining different combos multiplies your points. Spend Cognus in the market on wallpapers, songs, themes and titles." },
  { q: "How do online battles work?", a: "Create a room and share the 5-letter join code. Up to six players jam the same song for 90 seconds while seeing each other's hand skeletons live. The most Cognus wins." },
];

export default function HowToPlay() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const howLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to remix music with your hands in HandJam",
    totalTime: "PT2M",
    step: [
      { "@type": "HowToStep", name: "Open HandJam", text: "Go to HandJam in your browser and allow camera access.", url: SITE_URL },
      { "@type": "HowToStep", name: "Pinch to bend the song", text: "Pinch your left thumb and index finger to change speed, your right to change pitch." },
      { "@type": "HowToStep", name: "Stretch and spread", text: "Stretch your middle fingers for bass and echo, and move your hands apart for volume." },
      { "@type": "HowToStep", name: "Use your arms", text: "Lower your left arm to filter the sound and raise your right arm to add reverb." },
      { "@type": "HowToStep", name: "Land combos", text: "Start a session and land combos to earn Cognus, then battle friends online." },
    ],
  };
  return (
    <SeoPage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, howLd]) }} />
      <h1 className="mt-8 text-5xl font-light tracking-tight">How to play HandJam</h1>
      <p className="text-lg">
        HandJam is a free browser game that turns your webcam into a DJ controller. Your hands bend the music in real time:
        no controller, no download, no sign-up needed. Here is every gesture.
      </p>

      <h2>The gestures</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ["Right pinch → pitch", "Pinch your right thumb and index finger together to drop the pitch, open them to raise it, up to an octave either way."],
          ["Left pinch → speed", "Your left pinch sets the tempo from half speed to double speed."],
          ["Right middle finger → echo", "Stretch your right middle finger away from your thumb to throw echo on the track."],
          ["Left middle finger → bass", "Stretch your left middle finger to boost the bass."],
          ["Hands apart → volume", "Move your hands apart to turn it up, together to turn it down."],
          ["Arms → filter and reverb", "Lower your left arm to muffle the sound with a filter, raise your right arm to add reverb."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="!mt-0">{t}</h3>
            <p className="!mt-1 text-sm">{d}</p>
          </li>
        ))}
      </ul>
      <p>
        Point your index finger at any button and hold still for a second to click it. Take a hand out of view and its effects
        reset. Swipe your finger sideways to flick through your music library.
      </p>

      <h2>Modes</h2>
      <h3>Free play</h3>
      <p>Remix anything you like with no clock and no score: a generated track, a 30-second preview from the music finder, or your own MP3.</p>
      <h3>Sessions</h3>
      <p>
        Two minutes to earn as much <strong>Cognus</strong> as you can by landing <Link href="/combos" className="underline">combos</Link>.
        Chain different combos to multiply your score.
      </p>
      <h3>Online battles</h3>
      <p>Make a room, share the code, and battle up to five friends on the same song. You see everyone&apos;s hands live and the podium earns bonus Cognus.</p>
      <h3>Season pass, ranks and the market</h3>
      <p>
        Everything you earn levels a 30-tier season pass and your rank, from Bronze to Legend, on a live global leaderboard. Spend
        Cognus on wallpapers, new songs, album rows for your home screen, HUD colour themes and titles.
      </p>

      <h2>Frequently asked questions</h2>
      {FAQ.map((f) => (
        <section key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </section>
      ))}

      <p className="mt-12">
        <Link href="/" className="inline-block rounded-full bg-[#E8FF1F] px-6 py-3 font-semibold text-black">Play HandJam free</Link>
      </p>
    </SeoPage>
  );
}
