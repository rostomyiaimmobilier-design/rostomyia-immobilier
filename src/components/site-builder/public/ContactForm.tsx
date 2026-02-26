"use client";

import { useState } from "react";

export default function ContactForm({
  submitLabel,
  pageSlug,
}: {
  submitLabel?: string;
  pageSlug?: string;
}) {
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      message: String(formData.get("message") || ""),
      pageSlug: pageSlug || null,
    };

    try {
      const response = await fetch("/api/site/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Unable to send message.");
        return;
      }

      setSuccess("Message sent successfully. We will contact you soon.");
      form.reset();
    } catch {
      setError("Unable to send message.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder="Your name" className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
        <input name="email" required type="email" placeholder="Your email" className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
      </div>
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
      <textarea name="message" required rows={5} placeholder="Tell us about your project" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
      <button type="submit" disabled={pending} className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Sending..." : submitLabel || "Send message"}
      </button>
      {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
    </form>
  );
}
