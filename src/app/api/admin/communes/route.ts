import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AppCommuneRow = {
  code: string;
  name: string;
  wilaya_code: string | null;
  wilaya_name: string | null;
  is_active: boolean | null;
};

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isMissingTableError(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("app_communes") && (m.includes("does not exist") || m.includes("relation"));
}

async function ensureAdminOrError() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdmin = await hasAdminAccess(supabase, user);
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

export async function GET(req: Request) {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  try {
    const url = new URL(req.url);
    const wilayaCode = normalizeName(url.searchParams.get("wilayaCode") || "31");

    const admin = supabaseAdmin();
    const result = await admin
      .from("app_communes")
      .select("code, name, wilaya_code, wilaya_name, is_active")
      .eq("is_active", true)
      .eq("wilaya_code", wilayaCode)
      .order("name", { ascending: true });

    if (result.error) {
      if (isMissingTableError(result.error.message)) {
        return NextResponse.json({
          items: ORAN_COMMUNES.map((name) => ({ value: name, label: name })),
          managed: false,
          warning: "Table app_communes absente. Lancez la migration app_communes.",
        });
      }
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    const rows = (result.data ?? []) as AppCommuneRow[];
    const items = rows.map((row) => {
      const name = normalizeName(String(row.name));
      return {
        value: name,
        label: name,
      };
    });

    if (!items.length && wilayaCode === "31") {
      return NextResponse.json({
        items: ORAN_COMMUNES.map((name) => ({ value: name, label: name })),
        managed: false,
        warning: "Aucune commune Oran en base. Utilisez Sync Algerie DB.",
      });
    }

    return NextResponse.json({
      items,
      managed: true,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: parseError(err, "Unable to list communes") },
      { status: 400 }
    );
  }
}
