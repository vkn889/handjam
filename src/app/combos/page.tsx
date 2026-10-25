import type { Metadata } from "next";
import Link from "next/link";
import { SeoPage } from "@/components/SeoPage";
import { COMBOS, STYLE_PER_COMBO } from "@/lib/combos";

export const metadata: Metadata = {
  title: "Combo Guide: Every Gesture Combo and How to Land It",
  description:
    "The complete HandJam combo list: Bass Drop, Tape Stop, Riser, Echo Throw, Twin Pinch, Mirror Flip, Wash Out, Wobble and Full Stack. How to do each one, what it is worth and how chains multiply your Cognus.",
  alternates: { canonical: "/combos" },
};

export default function Combos() {
  return (
    <SeoPage>
      <h1 className="mt-8 text-5xl font-light tracking-tight">HandJam combo guide</h1>
      <p className="text-lg">
        In HandJam, Cognus only comes from combos: deliberate gesture moves you perform with your hands in front of your webcam.
        Hold each setup on purpose; random waving earns nothing.
      </p>
      <h2>Scoring rules</h2>
      <ul className="mt-3 list-disc pl-5">
        <li>Repeating the same combo pays 40% less each time.</li>
        <li>Landing a different combo within 5 seconds builds a chain: +25% per link, up to ×2.</li>
        <li>Every different combo in a session adds a +{STYLE_PER_COMBO} style bonus.</li>
      </ul>
      <h2>All {COMBOS.length} combos</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {COMBOS.map((c) => (
          <section key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="!mt-0 flex justify-between text-lg">
              {c.name} <span className="text-[#E8FF1F]">{c.base} Cognus</span>
            </h3>
            <p className="!mt-2 text-sm">{c.how}</p>
          </section>
        ))}
      </div>
      <p className="mt-12">
        Ready? <Link href="/" className="underline">Start a session</Link> or read <Link href="/how-to-play" className="underline">how to play</Link>.
      </p>
    </SeoPage>
  );
}
