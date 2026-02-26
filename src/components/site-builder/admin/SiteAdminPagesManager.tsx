"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type AdminPage = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDesc: string | null;
  isPublished: boolean;
  order: number;
  sections: Array<{ id: string }>;
};

type Settings = {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string | null;
  bodyFont: string | null;
  copyrightText: string | null;
  footerColumns: unknown;
  socials: unknown;
};

type CreateState = {
  title: string;
  slug: string;
};

export default function SiteAdminPagesManager({
  initialPages,
  initialSettings,
}: {
  initialPages: AdminPage[];
  initialSettings: Settings;
}) {
  const [pages, setPages] = useState<AdminPage[]>([...initialPages].sort((a, b) => a.order - b.order));
  const [createState, setCreateState] = useState<CreateState>({ title: "", slug: "" });
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [settingsPending, setSettingsPending] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState<string | null>(null);

  const footerColumnsText = useMemo(
    () => JSON.stringify(settings.footerColumns ?? [], null, 2),
    [settings.footerColumns]
  );
  const socialsText = useMemo(() => JSON.stringify(settings.socials ?? [], null, 2), [settings.socials]);
  const [footerJson, setFooterJson] = useState(footerColumnsText);
  const [socialsJson, setSocialsJson] = useState(socialsText);

  function updatePage(id: string, patch: Partial<AdminPage>) {
    setPages((prev) => prev.map((page) => (page.id === id ? { ...page, ...patch } : page)));
  }

  async function createPage(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setMessage(null);
    setCreatePending(true);

    try {
      const response = await fetch("/api/site-admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: createState.title, slug: createState.slug || undefined }),
      });

      const data = (await response.json()) as { page?: AdminPage; error?: string };
      const createdPage = data.page;
      if (!response.ok || !createdPage) {
        setCreateError(data.error || "Unable to create page.");
        return;
      }

      setPages((prev) => [...prev, createdPage].sort((a, b) => a.order - b.order));
      setCreateState({ title: "", slug: "" });
      setMessage("Page created.");
    } catch {
      setCreateError("Unable to create page.");
    } finally {
      setCreatePending(false);
    }
  }

  async function savePage(page: AdminPage) {
    setMessage(null);
    const response = await fetch(`/api/site-admin/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: page.title,
        slug: page.slug,
        seoTitle: page.seoTitle || null,
        seoDesc: page.seoDesc || null,
        isPublished: page.isPublished,
      }),
    });

    const data = (await response.json().catch(() => null)) as { page?: AdminPage; error?: string } | null;
    if (!response.ok || !data?.page) {
      throw new Error(data?.error || "Unable to save page.");
    }

    updatePage(page.id, data.page);
    setMessage(`Saved "${data.page.title}".`);
  }

  async function deletePage(id: string) {
    const ok = window.confirm("Delete this page and all its sections?");
    if (!ok) return;

    const response = await fetch(`/api/site-admin/pages/${id}`, { method: "DELETE" });
    if (!response.ok) return;

    setPages((prev) => prev.filter((page) => page.id !== id));
    setMessage("Page deleted.");
  }

  async function reorderPages(next: AdminPage[]) {
    setPages(next.map((page, index) => ({ ...page, order: index })));
    await fetch("/api/site-admin/pages/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageIds: next.map((page) => page.id) }),
    });
  }

  function movePage(pageId: string, direction: -1 | 1) {
    const currentIndex = pages.findIndex((page) => page.id === pageId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;

    const nextPages = [...pages];
    const [removed] = nextPages.splice(currentIndex, 1);
    nextPages.splice(nextIndex, 0, removed);
    reorderPages(nextPages);
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSettingsError(null);
    setSettingsSaved(null);
    setSettingsPending(true);

    try {
      const parsedFooter = JSON.parse(footerJson);
      const parsedSocials = JSON.parse(socialsJson);

      const response = await fetch("/api/site-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          footerColumns: parsedFooter,
          socials: parsedSocials,
        }),
      });

      const data = (await response.json()) as { settings?: Settings; error?: string };
      if (!response.ok || !data.settings) {
        setSettingsError(data.error || "Unable to save settings.");
        return;
      }

      setSettings(data.settings);
      setFooterJson(JSON.stringify(data.settings.footerColumns ?? [], null, 2));
      setSocialsJson(JSON.stringify(data.settings.socials ?? [], null, 2));
      setSettingsSaved("Settings saved.");
    } catch {
      setSettingsError("Invalid JSON in footer columns or socials.");
    } finally {
      setSettingsPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Pages Manager</h1>
            <p className="text-sm text-slate-600">Create pages, publish/unpublish, edit metadata, and manage ordering.</p>
          </div>
          <Link href="/site" target="_blank" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
            Open Public Site
          </Link>
        </div>

        <form onSubmit={createPage} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input
            required
            value={createState.title}
            onChange={(event) => setCreateState((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Page title"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
          <input
            value={createState.slug}
            onChange={(event) => setCreateState((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Optional slug"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
          <button
            disabled={createPending}
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
          >
            {createPending ? "Creating..." : "Create Page"}
          </button>
        </form>
        {createError ? <p className="mt-3 text-sm text-rose-600">{createError}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

        <div className="mt-6 space-y-4">
          {pages.map((page, index) => (
            <article key={page.id} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Title</span>
                  <input
                    value={page.title}
                    onChange={(event) => updatePage(page.id, { title: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Slug</span>
                  <input
                    value={page.slug}
                    onChange={(event) => updatePage(page.id, { slug: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SEO Title</span>
                  <input
                    value={page.seoTitle || ""}
                    onChange={(event) => updatePage(page.id, { seoTitle: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SEO Description</span>
                  <input
                    value={page.seoDesc || ""}
                    onChange={(event) => updatePage(page.id, { seoDesc: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => movePage(page.id, -1)}
                  type="button"
                  disabled={index === 0}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-40"
                >
                  Move Up
                </button>
                <button
                  onClick={() => movePage(page.id, 1)}
                  type="button"
                  disabled={index === pages.length - 1}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-40"
                >
                  Move Down
                </button>
                <label className="ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={page.isPublished}
                    onChange={(event) => updatePage(page.id, { isPublished: event.target.checked })}
                  />
                  Published
                </label>
                <span className="text-xs text-slate-500">{page.sections.length} section(s)</span>

                <div className="ml-auto flex flex-wrap gap-2">
                  <Link
                    href={`/site-admin/pages/${page.id}`}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                  >
                    Edit Sections
                  </Link>
                  <button
                    onClick={() => savePage(page)}
                    type="button"
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => deletePage(page.id)}
                    type="button"
                    className="rounded-full border border-rose-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Branding and Footer Settings</h2>
        <p className="mt-1 text-sm text-slate-600">Used by the dynamic navbar and footer on your public website.</p>

        <form onSubmit={saveSettings} className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={settings.brandName}
              onChange={(event) => setSettings((prev) => ({ ...prev, brandName: event.target.value }))}
              placeholder="Brand name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            <input
              value={settings.logoUrl || ""}
              onChange={(event) => setSettings((prev) => ({ ...prev, logoUrl: event.target.value }))}
              placeholder="Logo URL"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            <input
              value={settings.primaryColor}
              onChange={(event) => setSettings((prev) => ({ ...prev, primaryColor: event.target.value }))}
              placeholder="Primary color (#hex)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            <input
              value={settings.accentColor}
              onChange={(event) => setSettings((prev) => ({ ...prev, accentColor: event.target.value }))}
              placeholder="Accent color (#hex)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <textarea
            value={footerJson}
            onChange={(event) => setFooterJson(event.target.value)}
            rows={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
            placeholder="Footer columns JSON"
          />
          <textarea
            value={socialsJson}
            onChange={(event) => setSocialsJson(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
            placeholder="Social links JSON"
          />

          <button
            disabled={settingsPending}
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
          >
            {settingsPending ? "Saving..." : "Save Settings"}
          </button>
        </form>

        {settingsError ? <p className="mt-3 text-sm text-rose-600">{settingsError}</p> : null}
        {settingsSaved ? <p className="mt-3 text-sm text-emerald-700">{settingsSaved}</p> : null}
      </section>
    </div>
  );
}
