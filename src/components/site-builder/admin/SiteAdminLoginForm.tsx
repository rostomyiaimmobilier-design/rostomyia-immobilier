"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SiteAdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/site-admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Invalid password.");
        return;
      }

      router.replace("/site-admin/pages");
      router.refresh();
    } catch {
      setError("Unable to login.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.55)]"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Site Admin Login</h1>
        <p className="text-sm text-slate-600">Enter your admin password to manage pages, sections, and media.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Password</span>
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Logging in..." : "Login"}
      </button>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
    </form>
  );
}

