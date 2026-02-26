"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SectionType } from "@prisma/client";
import { SECTION_TYPE_OPTIONS } from "@/lib/site-builder/types";
import MediaPickerModal, { type MediaItem } from "@/components/site-builder/admin/MediaPickerModal";

type AdminSection = {
  id: string;
  pageId: string;
  type: SectionType;
  order: number;
  isHidden: boolean;
  content: Record<string, unknown>;
};

type AdminPage = {
  id: string;
  slug: string;
  title: string;
  sections: AdminSection[];
};

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export default function SiteAdminSectionsEditor({
  initialPage,
  initialMedia,
}: {
  initialPage: AdminPage;
  initialMedia: MediaItem[];
}) {
  const [sections, setSections] = useState<AdminSection[]>(
    [...initialPage.sections].sort((a, b) => a.order - b.order)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialPage.sections[0]?.id || null);
  const [addType, setAddType] = useState<SectionType>("HERO");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerHandler, setPickerHandler] = useState<((item: MediaItem) => void) | null>(null);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) || null,
    [sections, selectedSectionId]
  );

  const [itemsJsonBySection, setItemsJsonBySection] = useState<Record<string, string>>({});
  const itemsJson = selectedSection
    ? itemsJsonBySection[selectedSection.id] ??
      JSON.stringify((selectedSection.content.items as unknown) ?? [], null, 2)
    : "[]";

  function updateSection(id: string, patch: Partial<AdminSection>) {
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...patch } : section)));
  }

  function updateSelectedContent(patch: Record<string, unknown>) {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selectedSectionId) return section;
        return {
          ...section,
          content: { ...deepCopy(section.content), ...patch },
        };
      })
    );
  }

  function openMediaPicker(handler: (item: MediaItem) => void) {
    setPickerHandler(() => handler);
    setPickerOpen(true);
  }

  function onMediaPick(item: MediaItem) {
    if (pickerHandler) pickerHandler(item);
    setPickerOpen(false);
  }

  async function saveSection(section: AdminSection) {
    const response = await fetch(`/api/site-admin/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(section),
    });
    const data = (await response.json().catch(() => null)) as { section?: AdminSection; error?: string } | null;
    if (!response.ok || !data?.section) {
      throw new Error(data?.error || "Unable to save section.");
    }
    updateSection(section.id, data.section);
  }

  async function onSaveSelected() {
    if (!selectedSection) return;
    setMessage(null);
    setError(null);

    let nextSection = selectedSection;
    if (selectedSection.type === "FEATURES" || selectedSection.type === "PROJECTS" || selectedSection.type === "TESTIMONIALS") {
      try {
        const parsedItems = JSON.parse(itemsJson);
        nextSection = {
          ...selectedSection,
          content: { ...selectedSection.content, items: parsedItems },
        };
        updateSection(selectedSection.id, nextSection);
      } catch {
        setError("Items JSON is invalid.");
        return;
      }
    }

    try {
      await saveSection(nextSection);
      setMessage("Section saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save section.");
    }
  }

  async function addSection() {
    const response = await fetch("/api/site-admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: initialPage.id, type: addType }),
    });
    const data = (await response.json().catch(() => null)) as { section?: AdminSection; error?: string } | null;
    if (!response.ok || !data?.section) {
      setError(data?.error || "Unable to add section.");
      return;
    }

    const nextSections = [...sections, data.section].sort((a, b) => a.order - b.order);
    setSections(nextSections);
    setSelectedSectionId(data.section.id);
    setMessage(`${data.section.type} section added.`);
  }

  async function deleteSection() {
    if (!selectedSection) return;
    if (!window.confirm("Delete this section?")) return;

    const response = await fetch(`/api/site-admin/sections/${selectedSection.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Unable to delete section.");
      return;
    }

    const next = sections.filter((section) => section.id !== selectedSection.id);
    setSections(next);
    setSelectedSectionId(next[0]?.id || null);
    setMessage("Section deleted.");
  }

  async function persistOrder(next: AdminSection[]) {
    await fetch("/api/site-admin/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: initialPage.id, sectionIds: next.map((section) => section.id) }),
    });
  }

  async function moveSection(fromId: string, toId: string) {
    const from = sections.findIndex((section) => section.id === fromId);
    const to = sections.findIndex((section) => section.id === toId);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...sections];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    const normalized = next.map((section, index) => ({ ...section, order: index }));
    setSections(normalized);
    await persistOrder(normalized);
  }

  const content = (selectedSection?.content || {}) as Record<string, unknown>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{initialPage.title} - Section Editor</h1>
          <p className="text-sm text-slate-600">Left panel: organized sections. Right panel: details and fields.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/site-admin/pages" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
            Back
          </Link>
          <Link href={initialPage.slug === "home" ? "/site" : `/site/${initialPage.slug}`} target="_blank" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            Preview
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                draggable
                onDragStart={() => setDraggingId(section.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={async () => {
                  if (!draggingId) return;
                  await moveSection(draggingId, section.id);
                  setDraggingId(null);
                }}
                onClick={() => setSelectedSectionId(section.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedSectionId === section.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span>{section.type}</span>
                <span className="text-[10px] uppercase">{section.isHidden ? "hidden" : "live"}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Add Section</p>
            <div className="flex gap-2">
              <select value={addType} onChange={(event) => setAddType(event.target.value as SectionType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
                {SECTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.type} value={option.type}>{option.label}</option>
                ))}
              </select>
              <button type="button" onClick={addSection} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Add</button>
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedSection ? <p className="text-sm text-slate-500">Select a section to edit.</p> : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-lg font-semibold text-slate-900">{selectedSection.type}</h2>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={selectedSection.isHidden} onChange={(event) => updateSection(selectedSection.id, { isHidden: event.target.checked })} />
                  Hidden
                </label>
              </div>

              {(selectedSection.type === "HERO" || selectedSection.type === "CTA" || selectedSection.type === "CONTACT" || selectedSection.type === "SERVICES") ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={String(content.headline || "")} onChange={(event) => updateSelectedContent({ headline: event.target.value })} placeholder="Headline" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <input value={String(content.subheadline || "")} onChange={(event) => updateSelectedContent({ subheadline: event.target.value })} placeholder="Subheadline" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </div>
              ) : null}

              {selectedSection.type === "HERO" ? (
                <div className="space-y-3">
                  <input value={String(content.badge || "")} onChange={(event) => updateSelectedContent({ badge: event.target.value })} placeholder="Badge" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <textarea value={String(content.subheadline || "")} onChange={(event) => updateSelectedContent({ subheadline: event.target.value })} rows={3} placeholder="Hero description" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input value={String(content.imageUrl || "")} onChange={(event) => updateSelectedContent({ imageUrl: event.target.value })} placeholder="Image URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    <input value={String(content.imageAlt || "")} onChange={(event) => updateSelectedContent({ imageAlt: event.target.value })} placeholder="Image alt" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    <button type="button" onClick={() => openMediaPicker((item) => updateSelectedContent({ imageUrl: item.path, imageAlt: item.alt || "", imageId: item.id }))} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Pick</button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input value={String(content.ctaLabel || "")} onChange={(event) => updateSelectedContent({ ctaLabel: event.target.value })} placeholder="CTA label" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    <input value={String(content.ctaHref || "")} onChange={(event) => updateSelectedContent({ ctaHref: event.target.value })} placeholder="CTA URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  </div>
                </div>
              ) : null}

              {selectedSection.type === "SERVICES" ? (
                <div className="space-y-3">
                  <textarea value={String(content.intro || "")} onChange={(event) => updateSelectedContent({ intro: event.target.value })} rows={3} placeholder="Intro" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <textarea
                    value={Array.isArray(content.services) ? (content.services as string[]).join("\n") : ""}
                    onChange={(event) => updateSelectedContent({ services: event.target.value.split("\n").map((row) => row.trim()).filter(Boolean) })}
                    rows={7}
                    placeholder="One service per line"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              ) : null}

              {(selectedSection.type === "CTA" || selectedSection.type === "CONTACT") ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={String(content.buttonLabel || content.submitLabel || "")} onChange={(event) => updateSelectedContent({ buttonLabel: event.target.value, submitLabel: event.target.value })} placeholder="Button/Submit label" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <input value={String(content.buttonHref || "")} onChange={(event) => updateSelectedContent({ buttonHref: event.target.value })} placeholder="Button link" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </div>
              ) : null}

              {selectedSection.type === "CONTACT" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={String(content.email || "")} onChange={(event) => updateSelectedContent({ email: event.target.value })} placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <input value={String(content.phone || "")} onChange={(event) => updateSelectedContent({ phone: event.target.value })} placeholder="Phone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <input value={String(content.address || "")} onChange={(event) => updateSelectedContent({ address: event.target.value })} placeholder="Address" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 md:col-span-2" />
                </div>
              ) : null}

              {(selectedSection.type === "FEATURES" || selectedSection.type === "PROJECTS" || selectedSection.type === "TESTIMONIALS") ? (
                <div className="space-y-3">
                  <input value={String(content.headline || "")} onChange={(event) => updateSelectedContent({ headline: event.target.value })} placeholder="Headline" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <textarea value={String(content.intro || "")} onChange={(event) => updateSelectedContent({ intro: event.target.value })} rows={2} placeholder="Intro" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <textarea
                    value={itemsJson}
                    onChange={(event) =>
                      setItemsJsonBySection((prev) =>
                        selectedSection
                          ? { ...prev, [selectedSection.id]: event.target.value }
                          : prev
                      )
                    }
                    rows={12}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
                  />
                  <p className="text-xs text-slate-500">Edit items as JSON array (full control).</p>
                </div>
              ) : null}

              <div className="flex gap-2 border-t border-slate-200 pt-3">
                <button onClick={onSaveSelected} type="button" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Save Section</button>
                <button onClick={deleteSection} type="button" className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-600">Delete</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <MediaPickerModal
        open={pickerOpen}
        media={media}
        onClose={() => setPickerOpen(false)}
        onPick={onMediaPick}
        onMediaCreated={(item) => setMedia((prev) => [item, ...prev])}
      />
    </div>
  );
}
