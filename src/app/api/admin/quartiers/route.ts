import { NextResponse } from "next/server";
import { hasAdminAccess, hasAdminWriteAccess } from "@/lib/admin-auth";
import { DEFAULT_ORAN_QUARTIERS } from "@/lib/oran-locations";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type QuartierRow = {
  id: string;
  name: string;
  commune: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type OwnerLeadDistrictRow = {
  commune: string | null;
  district: string | null;
};

type PropertyLocationRow = {
  location: string | null;
};

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookupKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function parseError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isDuplicateError(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("duplicate key") || m.includes("already exists") || m.includes("unique");
}

function isMissingTableError(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("app_quartiers") && (m.includes("does not exist") || m.includes("relation"));
}

function fallbackItems() {
  return DEFAULT_ORAN_QUARTIERS.map((name, idx) => ({
    id: `fallback-${idx + 1}`,
    name,
    commune: "Oran" as string | null,
  }));
}

function formatRows(rows: QuartierRow[]) {
  const normalized = rows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      id: String(row.id),
      name: normalizeName(String(row.name)),
      commune: row.commune ? String(row.commune) : null,
      sort: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    }))
    .sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });

  return normalized.map((item) => ({
    id: item.id,
    name: item.name,
    commune: item.commune,
  }));
}

function splitLocationTokens(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[-,|/]/g)
    .map((token) => normalizeName(token))
    .filter(Boolean);
}

function pickQuartierFromLocation(location: string | null | undefined, commune: string) {
  const tokens = splitLocationTokens(location);
  if (!tokens.length) return "";
  const communeNorm = normalizeLookupKey(commune);
  const tokenNorms = tokens.map((token) => normalizeLookupKey(token));
  const communeIndex = tokenNorms.findIndex((token) => token === communeNorm);
  if (communeIndex < 0) return "";

  const after = tokens[communeIndex + 1] ?? "";
  if (after && normalizeLookupKey(after) !== communeNorm) return after;
  const before = tokens[communeIndex - 1] ?? "";
  if (before && normalizeLookupKey(before) !== communeNorm) return before;
  return "";
}

async function deriveQuartiersForCommuneFromDb(
  admin: ReturnType<typeof supabaseAdmin>,
  commune: string
) {
  const communeNorm = normalizeLookupKey(commune);
  const derived = new Map<string, { id: string; name: string; commune: string }>();

  try {
    const ownerLeadsResult = await admin
      .from("owner_leads")
      .select("commune, district")
      .not("district", "is", null)
      .limit(1200);

    if (!ownerLeadsResult.error) {
      const rows = (ownerLeadsResult.data ?? []) as OwnerLeadDistrictRow[];
      rows.forEach((row) => {
        const rowCommuneNorm = normalizeLookupKey(row.commune);
        if (!rowCommuneNorm || rowCommuneNorm !== communeNorm) return;
        const district = normalizeName(String(row.district ?? ""));
        if (!district || normalizeLookupKey(district) === communeNorm) return;
        const key = normalizeLookupKey(district);
        if (!key || derived.has(key)) return;
        derived.set(key, {
          id: `derived-owner-${key}`,
          name: district,
          commune: normalizeName(commune),
        });
      });
    }
  } catch {
    // Non-blocking source.
  }

  try {
    const propertiesResult = await admin
      .from("properties")
      .select("location")
      .not("location", "is", null)
      .limit(2000);

    if (!propertiesResult.error) {
      const rows = (propertiesResult.data ?? []) as PropertyLocationRow[];
      rows.forEach((row) => {
        const quartier = pickQuartierFromLocation(row.location, commune);
        if (!quartier) return;
        const quartierNorm = normalizeLookupKey(quartier);
        if (!quartierNorm || quartierNorm === communeNorm || derived.has(quartierNorm)) return;
        derived.set(quartierNorm, {
          id: `derived-prop-${quartierNorm}`,
          name: quartier,
          commune: normalizeName(commune),
        });
      });
    }
  } catch {
    // Non-blocking source.
  }

  return Array.from(derived.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );
}

async function ensureAdminOrError(options?: { requireWrite?: boolean }) {
  const requireWrite = options?.requireWrite === true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const hasAccess = requireWrite
    ? await hasAdminWriteAccess(supabase, user)
    : await hasAdminAccess(supabase, user);
  if (!hasAccess) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

async function selectActiveRows(admin: ReturnType<typeof supabaseAdmin>) {
  return admin
    .from("app_quartiers")
    .select("id, name, commune, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

async function seedDefaultsIfEmpty(admin: ReturnType<typeof supabaseAdmin>) {
  const initial = await selectActiveRows(admin);
  if (initial.error) {
    if (isMissingTableError(initial.error.message)) {
      return { rows: null, missingTable: true, error: null as string | null };
    }
    return { rows: null, missingTable: false, error: initial.error.message };
  }

  const rows = (initial.data ?? []) as QuartierRow[];
  if (rows.length > 0) {
    return { rows, missingTable: false, error: null as string | null };
  }

  const seedRows = DEFAULT_ORAN_QUARTIERS.map((name, idx) => ({
    name,
    commune: "Oran",
    sort_order: idx + 1,
    is_active: true,
  }));

  const seed = await admin.from("app_quartiers").insert(seedRows);
  if (seed.error && !isDuplicateError(seed.error.message)) {
    if (isMissingTableError(seed.error.message)) {
      return { rows: null, missingTable: true, error: null as string | null };
    }
    return { rows: null, missingTable: false, error: seed.error.message };
  }

  const refreshed = await selectActiveRows(admin);
  if (refreshed.error) {
    if (isMissingTableError(refreshed.error.message)) {
      return { rows: null, missingTable: true, error: null as string | null };
    }
    return { rows: null, missingTable: false, error: refreshed.error.message };
  }

  return { rows: (refreshed.data ?? []) as QuartierRow[], missingTable: false, error: null as string | null };
}

export async function GET(req: Request) {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  try {
    const requestUrl = new URL(req.url);
    const communeFilterRaw = normalizeName(requestUrl.searchParams.get("commune") || "");
    const communeFilterNorm = normalizeLookupKey(communeFilterRaw);
    const admin = supabaseAdmin();
    const result = await seedDefaultsIfEmpty(admin);

    if (communeFilterNorm) {
      if (result.missingTable) {
        const derivedItems = await deriveQuartiersForCommuneFromDb(admin, communeFilterRaw);
        return NextResponse.json({
          items: derivedItems,
          managed: false,
          warning:
            derivedItems.length > 0
              ? "Quartiers derives depuis les donnees existantes (table app_quartiers absente)."
              : "Aucun quartier disponible pour cette commune.",
        });
      }

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const scopedRows = formatRows(result.rows ?? []).filter(
        (item) => normalizeLookupKey(item.commune) === communeFilterNorm
      );

      if (scopedRows.length > 0) {
        return NextResponse.json({
          items: scopedRows,
          managed: true,
        });
      }

      const derivedItems = await deriveQuartiersForCommuneFromDb(admin, communeFilterRaw);
      return NextResponse.json({
        items: derivedItems,
        managed: false,
        warning:
          derivedItems.length > 0
            ? "Quartiers derives depuis owner_leads/properties pour cette commune."
            : "Aucun quartier configure pour cette commune.",
      });
    }

    if (result.missingTable) {
      return NextResponse.json({
        items: fallbackItems(),
        managed: false,
        warning: "Table app_quartiers absente. Lancez la migration pour activer la gestion persistante.",
      });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      items: formatRows(result.rows ?? []),
      managed: true,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Unable to list quartiers") }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const guard = await ensureAdminOrError({ requireWrite: true });
  if (guard.error) return guard.error;

  try {
    const body = (await req.json().catch(() => null)) as
      | { name?: unknown; commune?: unknown }
      | null;
    const rawName = typeof body?.name === "string" ? body.name : "";
    const normalizedName = normalizeName(rawName);
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return NextResponse.json(
        { error: "Le quartier doit contenir entre 2 et 80 caracteres." },
        { status: 400 }
      );
    }

    const communeRaw = typeof body?.commune === "string" ? body.commune : "Oran";
    const commune = normalizeName(communeRaw) || "Oran";

    const admin = supabaseAdmin();
    const maxSortRow = await admin
      .from("app_quartiers")
      .select("sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortRow.error) {
      if (isMissingTableError(maxSortRow.error.message)) {
        return NextResponse.json(
          { error: "Table app_quartiers absente. Lancez la migration d'abord." },
          { status: 503 }
        );
      }
      throw new Error(maxSortRow.error.message);
    }

    const nextSort = Number(maxSortRow.data?.sort_order ?? 0) + 1;
    const insert = await admin
      .from("app_quartiers")
      .insert({
        name: normalizedName,
        commune,
        sort_order: nextSort,
        is_active: true,
      })
      .select("id, name, commune")
      .single();

    if (insert.error) {
      if (isMissingTableError(insert.error.message)) {
        return NextResponse.json(
          { error: "Table app_quartiers absente. Lancez la migration d'abord." },
          { status: 503 }
        );
      }
      if (isDuplicateError(insert.error.message)) {
        return NextResponse.json({ error: "Ce quartier existe deja." }, { status: 409 });
      }
      throw new Error(insert.error.message);
    }

    const item = {
      id: String(insert.data.id),
      name: normalizeName(String(insert.data.name)),
      commune: insert.data.commune ? String(insert.data.commune) : null,
    };

    return NextResponse.json({ item });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Unable to create quartier") }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const guard = await ensureAdminOrError({ requireWrite: true });
  if (guard.error) return guard.error;

  try {
    const body = (await req.json().catch(() => null)) as
      | { id?: unknown; name?: unknown; commune?: unknown }
      | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "ID quartier manquant." }, { status: 400 });
    }
    if (id.startsWith("fallback-")) {
      return NextResponse.json(
        { error: "Quartier non persistant: lancez la migration pour activer la mise a jour." },
        { status: 400 }
      );
    }

    const rawName = typeof body?.name === "string" ? body.name : "";
    const normalizedName = normalizeName(rawName);
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return NextResponse.json(
        { error: "Le quartier doit contenir entre 2 et 80 caracteres." },
        { status: 400 }
      );
    }

    const communeRaw = typeof body?.commune === "string" ? body.commune : "Oran";
    const commune = normalizeName(communeRaw) || "Oran";

    const admin = supabaseAdmin();
    const existing = await admin
      .from("app_quartiers")
      .select("id")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing.error) {
      if (isMissingTableError(existing.error.message)) {
        return NextResponse.json(
          { error: "Table app_quartiers absente. Lancez la migration d'abord." },
          { status: 503 }
        );
      }
      throw new Error(existing.error.message);
    }
    if (!existing.data) {
      return NextResponse.json({ error: "Quartier introuvable." }, { status: 404 });
    }

    const updated = await admin
      .from("app_quartiers")
      .update({
        name: normalizedName,
        commune,
      })
      .eq("id", id)
      .select("id, name, commune")
      .single();

    if (updated.error) {
      if (isMissingTableError(updated.error.message)) {
        return NextResponse.json(
          { error: "Table app_quartiers absente. Lancez la migration d'abord." },
          { status: 503 }
        );
      }
      if (isDuplicateError(updated.error.message)) {
        return NextResponse.json({ error: "Ce quartier existe deja." }, { status: 409 });
      }
      throw new Error(updated.error.message);
    }

    const item = {
      id: String(updated.data.id),
      name: normalizeName(String(updated.data.name)),
      commune: updated.data.commune ? String(updated.data.commune) : null,
    };

    return NextResponse.json({ item });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Unable to update quartier") }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const guard = await ensureAdminOrError({ requireWrite: true });
  if (guard.error) return guard.error;

  try {
    const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "ID quartier manquant." }, { status: 400 });
    }
    if (id.startsWith("fallback-")) {
      return NextResponse.json(
        { error: "Quartier non persistant: lancez la migration pour activer la suppression." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();
    const existing = await admin
      .from("app_quartiers")
      .select("id, name")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing.error) {
      if (isMissingTableError(existing.error.message)) {
        return NextResponse.json(
          { error: "Table app_quartiers absente. Lancez la migration d'abord." },
          { status: 503 }
        );
      }
      throw new Error(existing.error.message);
    }

    if (!existing.data) {
      return NextResponse.json({ error: "Quartier introuvable." }, { status: 404 });
    }

    const archived = await admin
      .from("app_quartiers")
      .update({ is_active: false })
      .eq("id", id);

    if (archived.error) {
      if (isMissingTableError(archived.error.message)) {
        return NextResponse.json(
          { error: "Table app_quartiers absente. Lancez la migration d'abord." },
          { status: 503 }
        );
      }
      throw new Error(archived.error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Unable to delete quartier") }, { status: 400 });
  }
}
