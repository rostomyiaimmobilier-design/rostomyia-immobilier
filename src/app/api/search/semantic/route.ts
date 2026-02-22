import { NextResponse } from "next/server";
import { semanticSearchByQuery } from "@/lib/semantic-search";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        enabled: false,
        reason: "invalid_json",
        results: [],
      },
      { status: 400 }
    );
  }

  const payload = (body ?? {}) as {
    query?: string;
    limit?: number;
    minSimilarity?: number;
  };

  const query = String(payload.query ?? "").trim();
  if (!query) {
    return NextResponse.json({
      enabled: false,
      reason: "empty_query",
      results: [],
    });
  }

  const response = await semanticSearchByQuery(query, {
    limit: payload.limit,
    minSimilarity: payload.minSimilarity,
  });

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
