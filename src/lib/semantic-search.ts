import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const DEFAULT_EMBED_DIM = Number(process.env.OPENAI_EMBED_DIM || "1536");

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

export type SemanticSearchResult = {
  ref: string;
  score: number;
};

export type SemanticSearchResponse = {
  enabled: boolean;
  reason?: string;
  results: SemanticSearchResult[];
};

export type SemanticPropertyInput = {
  id: string;
  ref: string;
  title?: string | null;
  type?: string | null;
  locationType?: string | null;
  category?: string | null;
  location?: string | null;
  description?: string | null;
  price?: string | null;
  beds?: number | null;
  baths?: number | null;
  area?: number | null;
  amenities?: string[] | null;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toVectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function fetchEmbedding(text: string): Promise<{ embedding: number[] } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const query = normalizeText(text);
  if (!query) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_EMBED_MODEL,
        input: query,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as OpenAIEmbeddingResponse;
    const raw = payload.data?.[0]?.embedding;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const embedding = raw
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (embedding.length === 0) return null;
    if (Number.isFinite(DEFAULT_EMBED_DIM) && DEFAULT_EMBED_DIM > 0 && embedding.length !== DEFAULT_EMBED_DIM) {
      return null;
    }

    return { embedding };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function semanticSearchByQuery(
  query: string,
  options?: { limit?: number; minSimilarity?: number }
): Promise<SemanticSearchResponse> {
  const normalized = normalizeText(query);
  if (normalized.length < 3) {
    return { enabled: false, reason: "query_too_short", results: [] };
  }

  const embeddingPayload = await fetchEmbedding(normalized);
  if (!embeddingPayload) {
    return { enabled: false, reason: "embedding_unavailable", results: [] };
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return { enabled: false, reason: "supabase_admin_unavailable", results: [] };
  }

  const limit = Math.max(1, Math.min(120, Number(options?.limit ?? 60)));
  const minSimilarity = Math.max(0, Math.min(1, Number(options?.minSimilarity ?? 0.43)));
  const queryEmbeddingText = toVectorLiteral(embeddingPayload.embedding);

  const { data, error } = await admin.rpc("match_property_semantic", {
    query_embedding_text: queryEmbeddingText,
    match_count: limit,
    min_similarity: minSimilarity,
  });

  if (error) {
    return { enabled: false, reason: "rpc_unavailable", results: [] };
  }

  const rows = Array.isArray(data) ? data : [];
  const results: SemanticSearchResult[] = rows
    .map((row) => {
      const ref = normalizeText(typeof row?.ref === "string" ? row.ref : "");
      const similarityValue =
        typeof row?.similarity === "number"
          ? row.similarity
          : typeof row?.score === "number"
          ? row.score
          : NaN;
      if (!ref || !Number.isFinite(similarityValue)) return null;
      return { ref, score: Math.max(0, Math.min(1, similarityValue)) };
    })
    .filter((entry): entry is SemanticSearchResult => Boolean(entry))
    .sort((a, b) => b.score - a.score);

  return { enabled: true, results };
}

export function buildPropertySemanticText(input: SemanticPropertyInput): string {
  const amenitiesText = Array.isArray(input.amenities) ? input.amenities.join(" ") : "";
  return [
    input.title,
    input.type,
    input.locationType,
    input.category,
    input.location,
    input.description,
    input.price,
    input.beds != null ? `${input.beds} beds chambres` : "",
    input.baths != null ? `${input.baths} baths salles` : "",
    input.area != null ? `${input.area} m2 surface` : "",
    amenitiesText,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ");
}

export async function upsertPropertySemanticIndex(input: SemanticPropertyInput): Promise<boolean> {
  if (!input.id || !input.ref) return false;

  const textContent = buildPropertySemanticText(input);
  if (!textContent) return false;

  const embeddingPayload = await fetchEmbedding(textContent);
  if (!embeddingPayload) return false;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return false;
  }

  const { error } = await admin.from("property_semantic_index").upsert(
    {
      property_id: input.id,
      property_ref: input.ref,
      text_content: textContent,
      embedding: toVectorLiteral(embeddingPayload.embedding),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "property_id" }
  );

  return !error;
}
