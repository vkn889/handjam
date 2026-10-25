"use client";

import { useState } from "react";
import { LogOut, Mail, UserRound } from "lucide-react";
import { Bar, Card, inputClass, Panel, Pill, Tabs } from "@/components/ui/pill";
import { auth, authMessage, useAccount } from "@/lib/account";
import { itemById, rankFor } from "@/lib/catalog";

/** Sign in / create an account, or see and edit your profile. */
export function AccountView() {
  const { user, profile, ready } = useAccount();
  const rank = rankFor(profile.lifetime);

  return (
    <Panel
      title={user ? profile.name : "Your account"}
      subtitle={
        user
          ? user.anonymous
            ? "Playing as a guest. Add an email to keep your progress on any device."
            : user.email
          : auth.enabled
            ? "Sign in to save your Cognus, compete on the global leaderboard and play online."
            : "Accounts aren't set up yet, so progress is saved in this browser."
      }
      actions={user && <Pill tone="danger" onClick={() => void auth.signOut()}><LogOut size={15} /> Sign out</Pill>}
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Rank</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-light" style={{ color: rank.color }}>{rank.name}</span>
            <span className="text-sm text-white/60">{itemById(profile.equipped.title)?.name}</span>
          </div>
          <Bar value={rank.progress} color={rank.color} className="mt-4" />
          <p className="mt-2 text-xs text-white/55">
            {rank.next ? `${(rank.next.at - profile.lifetime).toLocaleString()} lifetime Cognus to ${rank.next.name}` : "Top rank. Legendary."}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Balance" value={profile.cognus} accent />
            <Stat label="Lifetime" value={profile.lifetime} />
            <Stat label="Best session" value={profile.best} />
            <Stat label="Online wins" value={profile.wins} />
          </div>
          <Rename current={profile.name} />
        </Card>

        {!user && auth.enabled && ready && <SignIn />}
        {user?.anonymous && auth.enabled && <SignIn upgrade />}
        {!auth.enabled && (
          <Card>
            <p className="font-medium">Turn on accounts</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Add your Firebase web config to <code className="rounded bg-white/10 px-1.5">.env.local</code> (see <code className="rounded bg-white/10 px-1.5">.env.example</code>) and restart the dev server. Everything you earn now carries over the first time you sign in.
            </p>
          </Card>
        )}
      </div>
    </Panel>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-black/30 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-white/50">{label}</p>
      <p className={`mt-1 text-xl font-light ${accent ? "text-[#E8FF1F]" : ""}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function Rename({ current }: { current: string }) {
  const [name, setName] = useState(current);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="mt-6 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void auth.rename(name).then(() => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 1500);
        });
      }}
    >
      <label className="sr-only" htmlFor="display-name">Display name</label>
      <input id="display-name" className={inputClass} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
      <Pill type="submit" disabled={!name.trim() || name === current}>{saved ? "Saved" : "Rename"}</Pill>
    </form>
  );
}

function SignIn({ upgrade }: { upgrade?: boolean }) {
  const [mode, setMode] = useState<"in" | "up">(upgrade ? "up" : "in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Tabs value={mode} onChange={setMode} options={[{ id: "in", label: "Sign in" }, { id: "up", label: "Create account" }]} />
      <form
        className="mt-5 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => (mode === "in" ? auth.signIn(email, password) : auth.signUp(name || email.split("@")[0], email, password)));
        }}
      >
        {mode === "up" && (
          <label className="grid gap-1.5 text-xs text-white/60">
            Display name
            <input className={inputClass} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
          </label>
        )}
        <label className="grid gap-1.5 text-xs text-white/60">
          Email
          <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="grid gap-1.5 text-xs text-white/60">
          Password
          <input
            className={inputClass}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <Pill type="submit" tone="solid" disabled={busy}>
          <Mail size={15} /> {busy ? "One moment…" : mode === "in" ? "Sign in" : "Create account"}
        </Pill>
      </form>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Pill onClick={() => void run(auth.google)} disabled={busy}>Continue with Google</Pill>
        {!upgrade && (
          <Pill onClick={() => void run(auth.guest)} disabled={busy}>
            <UserRound size={15} /> Play as guest
          </Pill>
        )}
      </div>
    </Card>
  );
}
