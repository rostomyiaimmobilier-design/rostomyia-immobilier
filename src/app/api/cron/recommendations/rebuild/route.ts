import { NextResponse } from "next/server";
import { rebuildRecommendationsBatch } from "@/lib/recommendations-background";
import { isCronSecretValid } from "@/lib/cron-auth";

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export async function GET(request: Request) {
  if (!isCronSecretValid(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitUsers = clampInt(url.searchParams.get("limitUsers"), 200, 1, 500);
  const topN = clampInt(url.searchParams.get("topN"), 24, 3, 60);
  const lookbackDays = clampInt(url.searchParams.get("lookbackDays"), 120, 1, 365);

  const startedAt = Date.now();
  const result = await rebuildRecommendationsBatch({
    limitUsers,
    topN,
    lookbackDays,
  });

  return NextResponse.json({
    ok: true,
    mode: "cron",
    limitUsers,
    topN,
    lookbackDays,
    durationMs: Date.now() - startedAt,
    ...result,
  });
}

