"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ORAN_QUARTIERS } from "@/lib/oran-locations";

export type AdminQuartierItem = {
  id: string;
  name: string;
  commune: string | null;
};

type ListQuartiersResponse = {
  items?: AdminQuartierItem[];
  managed?: boolean;
  warning?: string;
  error?: string;
};

type CreateQuartierResponse = {
  item?: AdminQuartierItem;
  error?: string;
};

type UpdateQuartierResponse = {
  item?: AdminQuartierItem;
  error?: string;
};

type ApiErrorResponse = {
  error?: string;
};

function normalizeText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fallbackQuartiers() {
  return DEFAULT_ORAN_QUARTIERS.map((name, idx) => ({
    id: `fallback-${idx + 1}`,
    name,
    commune: "Oran" as string | null,
  }));
}

function dedupeAndSort(items: AdminQuartierItem[]) {
  const unique = new Map<string, AdminQuartierItem>();

  for (const item of items) {
    const key = `${normalizeText(item.name)}|${normalizeText(item.commune ?? "")}`;
    if (!key) continue;
    if (!unique.has(key)) {
      unique.set(key, {
        id: String(item.id),
        name: normalizeName(String(item.name)),
        commune: item.commune ? String(item.commune) : null,
      });
    }
  }

  return Array.from(unique.values()).sort((a, b) => {
    const communeCompare = String(a.commune ?? "").localeCompare(String(b.commune ?? ""), "fr", {
      sensitivity: "base",
    });
    if (communeCompare !== 0) return communeCompare;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
}

async function readJsonSafely<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useAdminQuartiers() {
  const [quartiers, setQuartiers] = useState<AdminQuartierItem[]>(fallbackQuartiers());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [managed, setManaged] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshQuartiers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/quartiers", {
        method: "GET",
        credentials: "include",
      });
      const payload = await readJsonSafely<ListQuartiersResponse>(res);

      if (!res.ok) {
        throw new Error(payload?.error || "Impossible de charger la liste des quartiers.");
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      setQuartiers(dedupeAndSort(items.length ? items : fallbackQuartiers()));
      setManaged(Boolean(payload?.managed));
      setWarning(payload?.warning ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Impossible de charger la liste des quartiers.";
      setError(message);
      setQuartiers(fallbackQuartiers());
      setManaged(false);
      setWarning("Mode secours actif: utilisez la migration pour activer le catalogue persistant.");
    } finally {
      setLoading(false);
    }
  }, []);

  const addQuartier = useCallback(async (name: string, commune = "Oran") => {
    const trimmedName = normalizeName(name);
    if (trimmedName.length < 2) {
      throw new Error("Saisissez un nom de quartier valide.");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/quartiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmedName, commune }),
      });
      const payload = await readJsonSafely<CreateQuartierResponse>(res);
      if (!res.ok) {
        throw new Error(payload?.error || "Ajout du quartier impossible.");
      }

      const item = payload?.item;
      if (!item) {
        throw new Error("Reponse invalide lors de l'ajout du quartier.");
      }

      setQuartiers((prev) => dedupeAndSort([...prev, item]));
      setManaged(true);
      setWarning(null);
    } finally {
      setSaving(false);
    }
  }, []);

  const removeQuartier = useCallback(async (id: string) => {
    if (!id) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/quartiers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const payload = await readJsonSafely<ApiErrorResponse>(res);
      if (!res.ok) {
        throw new Error(payload?.error || "Suppression du quartier impossible.");
      }

      setQuartiers((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setSaving(false);
    }
  }, []);

  const updateQuartier = useCallback(async (id: string, name: string, commune = "Oran") => {
    const trimmedId = String(id || "").trim();
    const trimmedName = normalizeName(name);
    if (!trimmedId) {
      throw new Error("ID quartier manquant.");
    }
    if (trimmedName.length < 2) {
      throw new Error("Saisissez un nom de quartier valide.");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/quartiers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: trimmedId, name: trimmedName, commune }),
      });
      const payload = await readJsonSafely<UpdateQuartierResponse>(res);
      if (!res.ok) {
        throw new Error(payload?.error || "Mise a jour du quartier impossible.");
      }

      const item = payload?.item;
      if (!item) {
        throw new Error("Reponse invalide lors de la mise a jour du quartier.");
      }

      setQuartiers((prev) => dedupeAndSort(prev.map((x) => (x.id === trimmedId ? item : x))));
      setManaged(true);
      setWarning(null);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    void refreshQuartiers();
  }, [refreshQuartiers]);

  return {
    quartiers,
    loading,
    saving,
    managed,
    warning,
    error,
    refreshQuartiers,
    addQuartier,
    updateQuartier,
    removeQuartier,
  };
}
