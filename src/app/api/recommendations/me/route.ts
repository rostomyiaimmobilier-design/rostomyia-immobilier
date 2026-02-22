import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isMissingTableError(message: string | undefined, table: string) {
  const m = String(message ?? "").toLowerCase();
  return m.includes(table.toLowerCase()) && (m.includes("does not exist") || m.includes("relation"));
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      ok: true,
      source: "none",
      recommendations: [],
    });
  }

  const { data, error } = await supabase
    .from("user_recommendations")
    .select("property_ref, score, reason, rank, generated_at")
    .eq("user_id", user.id)
    .order("rank", { ascending: true })
    .limit(24);

  if (error) {
    if (isMissingTableError(error.message, "user_recommendations")) {
      return NextResponse.json({
        ok: true,
        source: "table_missing",
        recommendations: [],
      });
    }
    return NextResponse.json(
      {
        ok: false,
        source: "error",
        message: error.message ?? "load_failed",
        recommendations: [],
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    source: "background",
    recommendations: (data ?? []).map((row) => ({
      ref: String(row.property_ref ?? ""),
      score: Number(row.score ?? 0),
      reason: String(row.reason ?? ""),
      rank: Number(row.rank ?? 0),
      generatedAt: row.generated_at ?? null,
    })),
  });
}
