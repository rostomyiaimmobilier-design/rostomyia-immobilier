"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent, MouseEvent, ReactNode } from "react";
import { Copy, EyeOff, GripVertical, MoveDown, MoveUp, Palette, SquarePen, Trash2 } from "lucide-react";

export type AgencyEditableSectionId =
  | "hero"
  | "about"
  | "services"
  | "marketplace"
  | "contact"
  | "cta"
  | "testimonials";

type AgencyPreviewSectionAction = "edit" | "move-up" | "move-down" | "hide-show" | "duplicate" | "delete" | "style";
type AgencyPreviewComponentType = "text" | "button" | "image";
type AgencyPreviewSelectionKind = "section" | "component";
type AgencyPreviewSelectableKind = "section" | "component" | "slot";

export default function AgencyPreviewSectionOverlay({
  editable,
  section,
  label,
  children,
}: {
  editable: boolean;
  section: AgencyEditableSectionId;
  label: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hitAreaRef = useRef<HTMLButtonElement | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [componentRect, setComponentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectionPill, setSelectionPill] = useState("");

  function emitAction(action: AgencyPreviewSectionAction, fromSection?: AgencyEditableSectionId) {
    if (!editable || typeof window === "undefined") return;
    if (window.self === window.top) return;
    window.parent.postMessage(
      {
        type: "agency-preview-section-action",
        section,
        fromSection,
        action,
      },
      window.location.origin
    );
  }

  function emitSelection(
    selectionKind: AgencyPreviewSelectionKind,
    options?: {
      componentType?: AgencyPreviewComponentType;
      selectKind?: AgencyPreviewSelectableKind;
      selectId?: string;
      selectType?: string;
      selectPath?: string;
      slot?: string;
      openInspector?: boolean;
    }
  ) {
    if (!editable || typeof window === "undefined") return;
    if (window.self === window.top) return;
    window.parent.postMessage(
      {
        type: "agency-preview-selection",
        section,
        selectionKind,
        componentType: options?.componentType,
        selectKind: options?.selectKind,
        selectId: options?.selectId,
        selectType: options?.selectType,
        selectPath: options?.selectPath,
        slot: options?.slot,
        openInspector: options?.openInspector ?? false,
      },
      window.location.origin
    );
  }

  function onDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("text/plain", section);
    event.dataTransfer.effectAllowed = "move";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const fromSection = event.dataTransfer.getData("text/plain") as AgencyEditableSectionId;
    if (!fromSection || fromSection === section) return;
    emitAction("move-down", fromSection);
  }

  function resolveUnderlyingElement(event: MouseEvent<HTMLElement>) {
    if (typeof document === "undefined") return null;
    const hitArea = hitAreaRef.current;
    if (!hitArea) return null;
    const previousPointerEvents = hitArea.style.pointerEvents;
    hitArea.style.pointerEvents = "none";
    const target = document.elementFromPoint(event.clientX, event.clientY);
    hitArea.style.pointerEvents = previousPointerEvents;
    return target instanceof HTMLElement ? target : null;
  }

  function classifyComponent(target: HTMLElement | null): AgencyPreviewComponentType | null {
    if (!target) return null;
    if (target.closest("img,video,picture")) return "image";
    if (target.closest("a,button,[role='button'],input[type='button'],input[type='submit']")) return "button";
    if (target.closest("h1,h2,h3,h4,h5,h6,p,span,li,strong,em,small")) return "text";
    return null;
  }

  function escapeAttributeValue(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function isSelectableKind(value: string): value is AgencyPreviewSelectableKind {
    return value === "section" || value === "component" || value === "slot";
  }

  function getSelectableTarget(target: HTMLElement | null, preferParent = false) {
    if (!target) return null;
    const current = target.closest<HTMLElement>("[data-select-kind]");
    if (!current) return null;
    if (!preferParent) return current;
    return current.parentElement?.closest<HTMLElement>("[data-select-kind]") || current;
  }

  function resolveComponentType(target: HTMLElement | null): AgencyPreviewComponentType | null {
    if (!target) return null;
    const slot = target.dataset.slot || "";
    const selectType = target.dataset.selectType || "";
    if (slot === "image" || selectType.toLowerCase().includes("image")) return "image";
    if (slot === "link" || slot === "button" || selectType.toLowerCase().includes("button")) return "button";
    if (slot === "text") return "text";
    return classifyComponent(target);
  }

  function formatSelectionPill(target: HTMLElement | null, sectionLabel: string) {
    if (!target) return sectionLabel;
    const type = target.dataset.selectType || target.dataset.slot || "";
    if (!type) return sectionLabel;
    return `${sectionLabel} / ${type}`;
  }

  function focusComponentRect(target: HTMLElement | null) {
    const root = rootRef.current;
    if (!root || !target) {
      setComponentRect(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const width = Math.max(16, targetRect.width);
    const height = Math.max(16, targetRect.height);
    setComponentRect({
      x: Math.max(0, targetRect.left - rootRect.left),
      y: Math.max(0, targetRect.top - rootRect.top),
      width: Math.min(rootRect.width, width),
      height: Math.min(rootRect.height, height),
    });
  }

  useEffect(() => {
    if (!editable || typeof window === "undefined") return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as
        | {
            type?: string;
            section?: AgencyEditableSectionId;
            componentType?: AgencyPreviewComponentType;
            selectPath?: string;
          }
        | null;
      if (!payload || payload.type !== "agency-preview-sync-selection") return;

      const selected = payload.section === section;
      setIsSelected(selected);

      if (!selected) {
        setComponentRect(null);
        setSelectionPill("");
        return;
      }

      const root = rootRef.current;
      if (!root) {
        setComponentRect(null);
        setSelectionPill(label);
        return;
      }

      let target: HTMLElement | null = null;
      if (payload.selectPath) {
        const byPath = root.querySelector<HTMLElement>(
          `[data-select-path="${escapeAttributeValue(payload.selectPath)}"]`
        );
        if (byPath) target = byPath;
      }
      if (!target && payload.componentType) {
        const selector =
          payload.componentType === "image"
            ? "img,video,picture"
            : payload.componentType === "button"
              ? "a,button,[role='button'],input[type='button'],input[type='submit']"
              : "h1,h2,h3,h4,h5,h6,p,span,li,strong,em,small";
        const fallback = root.querySelector(selector);
        if (fallback instanceof HTMLElement) target = fallback;
      }
      focusComponentRect(target);
      setSelectionPill(formatSelectionPill(target, label));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editable, section, label]);

  return (
    <div
      ref={rootRef}
      className={`group relative ${isSelected ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-white" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {children}
      {editable ? (
        <>
          {componentRect ? (
            <div
              className="pointer-events-none absolute z-[25] rounded-md border-2 border-amber-400 bg-amber-200/15 shadow-[0_0_0_2px_rgba(251,191,36,0.2)]"
              style={{
                left: `${componentRect.x}px`,
                top: `${componentRect.y}px`,
                width: `${componentRect.width}px`,
                height: `${componentRect.height}px`,
              }}
            />
          ) : null}
          <button
            ref={hitAreaRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const selectable = getSelectableTarget(resolveUnderlyingElement(event), event.shiftKey);
              const selectKind = selectable?.dataset.selectKind || "";
              const resolvedSelectKind = isSelectableKind(selectKind) ? selectKind : "section";
              const componentType = resolveComponentType(selectable);
              setIsSelected(true);
              if (resolvedSelectKind !== "section") {
                focusComponentRect(selectable);
                setSelectionPill(formatSelectionPill(selectable, label));
                emitSelection("component", {
                  componentType: componentType || "text",
                  selectKind: resolvedSelectKind,
                  selectId: selectable?.dataset.selectId,
                  selectType: selectable?.dataset.selectType,
                  selectPath: selectable?.dataset.selectPath,
                  slot: selectable?.dataset.slot,
                });
                return;
              }
              setComponentRect(null);
              setSelectionPill(label);
              emitSelection("section");
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              const selectable = getSelectableTarget(resolveUnderlyingElement(event), event.shiftKey);
              const selectKind = selectable?.dataset.selectKind || "";
              const resolvedSelectKind = isSelectableKind(selectKind) ? selectKind : "section";
              const componentType = resolveComponentType(selectable);
              if (resolvedSelectKind !== "section") {
                focusComponentRect(selectable);
                setSelectionPill(formatSelectionPill(selectable, label));
                emitSelection("component", {
                  componentType: componentType || "text",
                  selectKind: resolvedSelectKind,
                  selectId: selectable?.dataset.selectId,
                  selectType: selectable?.dataset.selectType,
                  selectPath: selectable?.dataset.selectPath,
                  slot: selectable?.dataset.slot,
                  openInspector: true,
                });
                return;
              }
              setComponentRect(null);
              setSelectionPill(label);
              emitSelection("section", { openInspector: true });
            }}
            className={`absolute inset-0 z-20 border-2 border-dashed bg-slate-900/5 transition hover:bg-slate-900/10 ${
              isSelected
                ? "border-amber-400/70 opacity-100"
                : "border-white/55 opacity-0 group-hover:opacity-100"
            }`}
            aria-label={`Modifier la section ${label}`}
          />
          <div className="absolute right-3 top-3 z-30 flex flex-wrap items-center gap-1 rounded-2xl border border-slate-900/15 bg-white/95 p-1.5 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.65)] backdrop-blur">
            <button
              type="button"
              draggable
              onDragStart={onDragStart}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Deplacer ${label}`}
              title="Drag to reorder"
            >
              <GripVertical size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("edit")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Edit ${label}`}
            >
              <SquarePen size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("style")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Style ${label}`}
            >
              <Palette size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("move-up")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Move up ${label}`}
            >
              <MoveUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("move-down")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Move down ${label}`}
            >
              <MoveDown size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("hide-show")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Hide or show ${label}`}
            >
              <EyeOff size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("duplicate")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              aria-label={`Duplicate ${label}`}
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              onClick={() => emitAction("delete")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
              aria-label={`Delete ${label}`}
            >
              <Trash2 size={13} />
            </button>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
              {selectionPill || label}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
