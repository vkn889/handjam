import Link from "next/link";

/** Plain, fast, server-rendered page shell for the text pages search engines read. */
export function SeoPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-[#031C26] bg-[radial-gradient(120%_80%_at_50%_0%,#1B6CA8_0%,#031C26_60%)] text-white">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-2xl font-light tracking-tight">HandJam</Link>
        <nav aria-label="Site" className="flex gap-5 text-sm text-white/80">
          <Link href="/how-to-play" className="hover:text-white">How to play</Link>
          <Link href="/combos" className="hover:text-white">Combos</Link>
          <Link href="/" className="rounded-full bg-[#E8FF1F] px-4 py-1.5 font-semibold text-black hover:bg-[#f2ff7a]">Play free</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-5 pb-20 leading-relaxed [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-light [&_h3]:mt-6 [&_h3]:font-medium [&_p]:mt-3 [&_p]:text-white/80 [&_li]:text-white/80">
        {children}
      </main>
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/50">
        HandJam · free hand-tracking music remix game · <Link href="/" className="underline">play now</Link>
      </footer>
    </div>
  );
}
