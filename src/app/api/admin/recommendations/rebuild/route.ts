import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { rebuildRecommendationsBatch } from "@/lib/recommendations-background";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await hasAdminAccess(supabase, user);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = (body ?? {}) as {
    userIds?: string[];
    limitUsers?: number;
    topN?: number;
    lookbackDays?: number;
  };

  const result = await rebuildRecommendationsBatch({
    userIds: Array.isArray(payload.userIds) ? payload.userIds : undefined,
    limitUsers: payload.limitUsers,
    topN: payload.topN,
    lookbackDays: payload.lookbackDays,
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
