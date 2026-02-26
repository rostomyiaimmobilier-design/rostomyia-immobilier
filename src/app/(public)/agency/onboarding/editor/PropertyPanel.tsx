"use client";

import type React from "react";
import { useMemo, useState } from "react";
import {
  getByPath,
  type InspectorSchema,
  type InspectorFieldSchema,
} from "./inspector";

type PropertyPanelProps = {
  schema: InspectorSchema | null;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  breadcrumbs: string[];
  saving: boolean;
  onChange: (key: string, value: unknown) => void;
  onImagePick?: (key: string, file: File | null) => void;
  onArrayAdd?: (key: string) => void;
  onArrayRemove?: (key: string, index: number) => void;
  onArrayMove?: (key: string, index: number, direction: "up" | "down") => void;
  onArraySelect?: (key: string, index: number) => void;
  selectedArrayPath?: string | null;
  arrayItemLabel?: (key: string, item: unknown, index: number) => string;
  actions?: React.ReactNode;
};

function renderField(
  field: InspectorFieldSchema,
  value: unknown,
  props: PropertyPanelProps
) {
  const error = props.errors[field.key] || "";
  const commonClass =
    "h-9 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35";

  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <textarea
          value={String(value ?? "")}
          onChange={(event) => props.onChange(field.key, event.target.value)}
          rows={field.rows || 4}
          placeholder={field.placeholder}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[11px] text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
        />
        {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="space-y-1">
        <input
          type="number"
          value={Number.isFinite(Number(value)) ? Number(value) : 0}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(event) => props.onChange(field.key, Number(event.target.value))}
          className={commonClass}
        />
        {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "slider") {
    const numericValue = Number.isFinite(Number(value)) ? Number(value) : Number(field.min ?? 0);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={numericValue}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            onChange={(event) => props.onChange(field.key, Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[rgb(var(--navy))]"
          />
          <span className="min-w-[42px] rounded-md border border-black/10 bg-slate-50 px-1.5 py-1 text-center text-[10px] font-semibold text-[rgb(var(--navy))]">
            {numericValue}
          </span>
        </div>
        {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="inline-flex items-center gap-2 text-[11px] text-black/75">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => props.onChange(field.key, event.target.checked)}
          className="h-4 w-4 rounded border-black/20"
        />
        <span>{Boolean(value) ? "Active" : "Inactive"}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <select
          value={String(value ?? "")}
          onChange={(event) => props.onChange(field.key, event.target.value)}
          className={commonClass}
        >
          {(field.options || []).map((option) => (
            <option key={`${field.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "color") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value || "#0f172a")}
            onChange={(event) => props.onChange(field.key, event.target.value)}
            className="h-9 w-12 rounded-md border border-black/10 bg-white p-1"
          />
          <input
            type="text"
            value={String(value || "#0f172a")}
            onChange={(event) => props.onChange(field.key, event.target.value)}
            className={commonClass}
            placeholder="#0f172a"
          />
        </div>
        {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "image") {
    const imageUrl = String(value ?? "").trim();
    return (
      <div className="space-y-1.5">
        {imageUrl ? (
          <div
            className="h-20 w-full overflow-hidden rounded-md border border-black/10 bg-slate-50"
            style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            aria-label="Media preview"
            role="img"
          >
          </div>
        ) : null}
        <input
          type="text"
          value={imageUrl}
          onChange={(event) => props.onChange(field.key, event.target.value)}
          placeholder={field.placeholder || "https://..."}
          className={commonClass}
        />
        {props.onImagePick ? (
          <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-black/10 px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5">
            Media picker
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => props.onImagePick?.(field.key, event.target.files?.[0] ?? null)}
            />
          </label>
        ) : null}
        {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "array") {
    const arrayValue = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-1.5">
        <div className="space-y-1">
          {arrayValue.length === 0 ? (
            <p className="rounded-md border border-dashed border-black/15 px-2 py-1.5 text-[10px] text-black/55">
              Aucun element.
            </p>
          ) : (
            arrayValue.map((item, index) => {
              const isSelected = props.selectedArrayPath === `${field.key}.${index}`;
              const label = props.arrayItemLabel
                ? props.arrayItemLabel(field.key, item, index)
                : typeof item === "string"
                  ? item
                  : `Item ${index + 1}`;
              return (
                <div
                  key={`${field.key}-${index}`}
                  className={`flex items-center gap-1 rounded-md border px-1.5 py-1 ${
                    isSelected ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/5" : "border-black/10 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => props.onArraySelect?.(field.key, index)}
                    className="min-w-0 flex-1 truncate text-left text-[10px] text-[rgb(var(--navy))]"
                  >
                    {label}
                  </button>
                  <button type="button" onClick={() => props.onArrayMove?.(field.key, index, "up")} className="h-6 w-6 rounded border border-black/10 text-[10px]">↑</button>
                  <button type="button" onClick={() => props.onArrayMove?.(field.key, index, "down")} className="h-6 w-6 rounded border border-black/10 text-[10px]">↓</button>
                  <button type="button" onClick={() => props.onArrayRemove?.(field.key, index)} className="h-6 w-6 rounded border border-red-200 bg-red-50 text-[10px] text-red-600">×</button>
                </div>
              );
            })
          )}
        </div>
        <button
          type="button"
          onClick={() => props.onArrayAdd?.(field.key)}
          className="inline-flex h-8 items-center rounded-md border border-black/10 px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
        >
          + Add item
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={String(value ?? "")}
        onChange={(event) => props.onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        className={commonClass}
      />
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}

export default function PropertyPanel(props: PropertyPanelProps) {
  const groupKeys = useMemo(
    () =>
      (props.schema?.groups || []).map((group, index) => ({
        key: `${props.schema?.title || "panel"}-${group.label}-${index}`,
        index,
        group,
      })),
    [props.schema]
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  if (!props.schema) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-3 text-[11px] text-black/55">
        Selectionnez un element du canvas pour afficher ses proprietes.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/50">
          {props.breadcrumbs.join(" > ")}
        </div>
        <div className="mt-1.5 text-[13px] font-semibold text-[rgb(var(--navy))]">{props.schema.title}</div>
        <div className="mt-1 text-[10px] text-black/55">{props.saving ? "Saving..." : "All changes synced"}</div>
      </div>

      {props.actions ? (
        <div className="rounded-2xl border border-black/10 bg-white p-2.5">{props.actions}</div>
      ) : null}

      {groupKeys.map((entry) => {
        const isCollapsed = collapsedGroups[entry.key] ?? entry.index > 0;
        return (
          <section key={entry.key} className="rounded-2xl border border-black/10 bg-white p-3">
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups((prev) => ({
                  ...prev,
                  [entry.key]: !prev[entry.key],
                }))
              }
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                {entry.group.label}
              </span>
              <span className="text-[10px] text-black/55">{isCollapsed ? "+" : "-"}</span>
            </button>

            {!isCollapsed ? (
              <div className="mt-2 space-y-2">
                {entry.group.fields.map((field) => {
                  const value = getByPath(props.values, field.key);
                  return (
                    <label key={`${entry.group.label}-${field.key}`} className="space-y-1">
                      <span className="text-[10px] text-black/55">{field.label}</span>
                      {renderField(field, value, props)}
                      {field.description ? <p className="text-[10px] text-black/45">{field.description}</p> : null}
                    </label>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
