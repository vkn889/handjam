"use client";

import { cn } from "@/lib/utils";

/**
 * A light glass button for dense screens (market grids, lists). The LiquidMetalButton
 * is reserved for the few main actions: each one runs its own WebGL shader.
 */
export function Pill({
  className,
  tone = "glass",
  size = "md",
  ...props
}: React.ComponentProps<"button"> & { tone?: "glass" | "accent" | "solid" | "danger"; size?: "sm" | "md" }) {
  return (
    <button
      data-hand-target=""
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-9 px-3.5 text-xs" : "h-11 px-5 text-sm",
        tone === "glass" && "border border-white/15 bg-white/10 text-white hover:bg-white/20",
        tone === "accent" && "bg-[#E8FF1F] text-black hover:bg-[#f2ff7a]",
        tone === "solid" && "bg-white text-black hover:bg-white/85",
        tone === "danger" && "border border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/30",
        className,
      )}
      {...props}
    />
  );
}

/** Segmented tabs. */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-black/40 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          data-hand-target=""
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors duration-200",
            value === o.id ? "bg-white text-black" : "text-white/75 hover:bg-white/10 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Full-screen panel under the nav bar. */
export function Panel({ title, subtitle, actions, children, wide }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 top-[76px] z-30 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-md sm:px-8">
      <div className={cn("mx-auto", wide ? "max-w-[1320px]" : "max-w-5xl")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-light tracking-tight">{title}</h1>
            {subtitle && <div className="mt-1.5 text-sm text-white/65">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-white/10 bg-white/[0.05] p-5", className)} {...props} />;
}

/** A thin progress bar. */
export function Bar({ value, color = "#E8FF1F", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-white/10", className)}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none";
