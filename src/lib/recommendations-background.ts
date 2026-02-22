import { supabaseAdmin } from "@/lib/supabase/admin";

type BehaviorEventType = "view" | "favorite" | "contact" | "search_click";

type BehaviorEventRow = {
  user_id: string;
  event_type: BehaviorEventType;
  property_ref: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

type PropertyRow = {
  ref: string;
  title: string | null;
  type: string | null;
  location_type: string | null;
  category: string | null;
  location: string | null;
  price: string | null;
  created_at: string | null;
  amenities?: string[] | null;
};

type RecommendationProfile = {
  categoryWeights: Record<string, number>;
  communeWeights: Record<string, number>;
  amenityWeights: Record<string, number>;
  dealTypeWeights: Record<string, number>;
  preferredPrice: number | null;
  priceWeight: number;
};

type RankedRecommendation = {
  property_ref: string;
  score: number;
  reason: string;
  rank: number;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoneyToNumber(input: string | null | undefined): number | null {
  const raw = String(input ?? "").toLowerCase().trim();
  if (!raw) return null;
  const mMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(m|million)\b/);
  if (mMatch) {
    const val = Number(mMatch[1].replace(",", "."));
    if (Number.isFinite(val)) return Math.round(val * 1_000_000);
  }
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCommuneFromLocation(location: string | null | undefined): string {
  const parts = String(location ?? "")
    .split(/[-,|/·•–—]/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function normalizeDealType(row: Pick<PropertyRow, "type" | "location_type">): string {
  const locationType = normalizeText(row.location_type);
  if (locationType.includes("vente")) return "vente";
  if (
    locationType.includes("par_nuit") ||
    locationType.includes("par nuit") ||
    locationType.includes("court_sejour") ||
    locationType.includes("court sejour")
  ) {
    return locationType.includes("par_nuit") || locationType.includes("par nuit")
      ? "par_nuit"
      : "court_sejour";
  }
  if (locationType.includes("par_mois") || locationType.includes("par mois")) return "par_mois";
  if (locationType.includes("six_mois") || locationType.includes("six mois")) return "six_mois";
  if (locationType.includes("douze_mois") || locationType.includes("douze mois")) return "douze_mois";
  if (locationType.includes("location")) return "location";
  return normalizeText(row.type) || "location";
}

function addWeighted(map: Record<string, number>, key: string, weight: number) {
  if (!key || !Number.isFinite(weight) || weight <= 0) return;
  map[key] = (map[key] ?? 0) + weight;
}

function eventWeight(type: BehaviorEventType): number {
  if (type === "contact") return 4;
  if (type === "favorite") return 3;
  if (type === "view") return 1;
  return 1.2;
}

function buildProfile(
  events: BehaviorEventRow[],
  propertiesByRef: Map<string, PropertyRow>
): RecommendationProfile {
  const profile: RecommendationProfile = {
    categoryWeights: {},
    communeWeights: {},
    amenityWeights: {},
    dealTypeWeights: {},
    preferredPrice: null,
    priceWeight: 0,
  };

  let weightedPriceTotal = 0;

  events.forEach((event) => {
    const weight = eventWeight(event.event_type);
    const refKey = normalizeText(event.property_ref);
    const property = refKey ? propertiesByRef.get(refKey) : null;

    if (property) {
      addWeighted(profile.categoryWeights, normalizeText(property.category), weight);
      addWeighted(profile.communeWeights, parseCommuneFromLocation(property.location), weight);
      addWeighted(profile.dealTypeWeights, normalizeDealType(property), weight);
      (property.amenities ?? []).forEach((amenity) => addWeighted(profile.amenityWeights, normalizeText(amenity), weight));

      const price = parseMoneyToNumber(property.price);
      if (price != null) {
        weightedPriceTotal += price * weight;
        profile.priceWeight += weight;
      }
    }

    const payload = event.payload ?? {};
    addWeighted(profile.categoryWeights, normalizeText(String(payload.category ?? "")), weight * 0.55);
    addWeighted(profile.communeWeights, normalizeText(String(payload.commune ?? "")), weight * 0.55);
    addWeighted(profile.dealTypeWeights, normalizeText(String(payload.dealType ?? "")), weight * 0.5);
    const payloadAmenities = Array.isArray(payload.amenities) ? payload.amenities : [];
    payloadAmenities.forEach((amenity) => addWeighted(profile.amenityWeights, normalizeText(String(amenity)), weight * 0.42));
  });

  if (profile.priceWeight > 0) {
    profile.preferredPrice = Math.round(weightedPriceTotal / profile.priceWeight);
  }

  return profile;
}

function topKey(map: Record<string, number>): string {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function scoreProperty(
  property: PropertyRow,
  profile: RecommendationProfile,
  nowTs: number
): { score: number; reason: string } {
  const categoryKey = normalizeText(property.category);
  const communeKey = parseCommuneFromLocation(property.location);
  const dealTypeKey = normalizeDealType(property);
  const amenities = (property.amenities ?? []).map((value) => normalizeText(value)).filter(Boolean);
  const price = parseMoneyToNumber(property.price);

  const categoryScore = profile.categoryWeights[categoryKey] ?? 0;
  const communeScore = profile.communeWeights[communeKey] ?? 0;
  const dealScore = profile.dealTypeWeights[dealTypeKey] ?? 0;
  const amenityScore = amenities.reduce((sum, key) => sum + (profile.amenityWeights[key] ?? 0), 0);
  const freshnessScore = (() => {
    const ts = property.created_at ? new Date(property.created_at).getTime() : NaN;
    if (!Number.isFinite(ts)) return 0;
    const ageDays = Math.max(0, (nowTs - ts) / (24 * 60 * 60 * 1000));
    return Math.max(0, 8 - ageDays * 0.1);
  })();
  const priceScore = (() => {
    if (profile.preferredPrice == null || price == null || profile.preferredPrice <= 0) return 0;
    const ratio = Math.abs(price - profile.preferredPrice) / profile.preferredPrice;
    return Math.max(0, 9 - ratio * 12);
  })();

  const score = categoryScore * 1.8 + communeScore * 1.6 + dealScore * 1.2 + amenityScore * 1.05 + freshnessScore + priceScore;
  const maxSignal = Math.max(categoryScore, communeScore, amenityScore, dealScore);
  let reason = "Suggestion personnalisee";
  if (maxSignal === communeScore && communeKey) reason = `Même zone: ${communeKey}`;
  else if (maxSignal === categoryScore && categoryKey) reason = `Même catégorie: ${property.category ?? categoryKey}`;
  else if (maxSignal === dealScore && dealTypeKey) reason = `Même transaction: ${dealTypeKey}`;
  else if (maxSignal === amenityScore && amenities.length > 0) {
    const topAmenity = amenities.sort((a, b) => (profile.amenityWeights[b] ?? 0) - (profile.amenityWeights[a] ?? 0))[0];
    reason = `Équipement proche: ${topAmenity}`;
  }

  return { score, reason };
}

async function fetchPropertiesForRanking(): Promise<PropertyRow[]> {
  const admin = supabaseAdmin();
  const selectWithAmenities =
    "ref, title, type, location_type, category, location, price, created_at, amenities";
  const withAmenities = await admin
    .from("properties")
    .select(selectWithAmenities)
    .order("created_at", { ascending: false })
    .limit(1500);

  if (!withAmenities.error) return (withAmenities.data ?? []) as PropertyRow[];
  const message = withAmenities.error.message?.toLowerCase() ?? "";
  const missingAmenities = message.includes("amenities") && (message.includes("column") || message.includes("does not exist"));
  if (!missingAmenities) return [];

  const fallback = await admin
    .from("properties")
    .select("ref, title, type, location_type, category, location, price, created_at")
    .order("created_at", { ascending: false })
    .limit(1500);
  if (fallback.error) return [];
  return ((fallback.data ?? []) as Array<Omit<PropertyRow, "amenities">>).map((row) => ({
    ...row,
    amenities: [],
  }));
}

async function fetchUserEvents(userId: string, lookbackDays: number): Promise<BehaviorEventRow[]> {
  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const response = await admin
    .from("user_behavior_events")
    .select("user_id, event_type, property_ref, payload, created_at")
    .eq("user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(2500);
  if (response.error) return [];
  return (response.data ?? []) as BehaviorEventRow[];
}

async function persistUserRecommendations(
  userId: string,
  profile: RecommendationProfile,
  recommendations: RankedRecommendation[]
) {
  const admin = supabaseAdmin();

  await admin
    .from("user_recommendation_profiles")
    .upsert(
      {
        user_id: userId,
        category_weights: profile.categoryWeights,
        commune_weights: profile.communeWeights,
        amenity_weights: profile.amenityWeights,
        deal_type_weights: profile.dealTypeWeights,
        price_preferences: {
          preferred_price: profile.preferredPrice,
          price_weight: profile.priceWeight,
          top_category: topKey(profile.categoryWeights),
          top_commune: topKey(profile.communeWeights),
          top_deal_type: topKey(profile.dealTypeWeights),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  await admin.from("user_recommendations").delete().eq("user_id", userId);
  if (recommendations.length === 0) return;

  await admin.from("user_recommendations").insert(
    recommendations.map((row) => ({
      user_id: userId,
      property_ref: row.property_ref,
      score: row.score,
      reason: row.reason,
      rank: row.rank,
      generated_at: new Date().toISOString(),
    }))
  );
}

export async function rebuildRecommendationsForUser(
  userId: string,
  options?: { topN?: number; lookbackDays?: number; properties?: PropertyRow[] }
): Promise<{ ok: boolean; created: number }> {
  const lookbackDays = Math.max(1, Math.min(365, Number(options?.lookbackDays ?? 120)));
  const topN = Math.max(3, Math.min(60, Number(options?.topN ?? 24)));
  const properties = options?.properties ?? (await fetchPropertiesForRanking());

  const events = await fetchUserEvents(userId, lookbackDays);
  const propertiesByRef = new Map<string, PropertyRow>(
    properties.map((property) => [normalizeText(property.ref), property])
  );
  const profile = buildProfile(events, propertiesByRef);
  const nowTs = Date.now();

  const ranked = properties
    .map((property) => {
      const result = scoreProperty(property, profile, nowTs);
      return {
        property_ref: property.ref,
        score: result.score,
        reason: result.reason,
      };
    })
    .filter((row) => row.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  await persistUserRecommendations(userId, profile, ranked);
  return { ok: true, created: ranked.length };
}

export async function rebuildRecommendationsBatch(options?: {
  userIds?: string[];
  limitUsers?: number;
  topN?: number;
  lookbackDays?: number;
}): Promise<{ processedUsers: number; generatedRows: number }> {
  const admin = supabaseAdmin();
  const limitUsers = Math.max(1, Math.min(500, Number(options?.limitUsers ?? 120)));
  const lookbackDays = Math.max(1, Math.min(365, Number(options?.lookbackDays ?? 120)));
  const topN = Math.max(3, Math.min(60, Number(options?.topN ?? 24)));

  let userIds = (options?.userIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (userIds.length === 0) {
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const usersResponse = await admin
      .from("user_behavior_events")
      .select("user_id")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (usersResponse.error) return { processedUsers: 0, generatedRows: 0 };
    const seen = new Set<string>();
    (usersResponse.data ?? []).forEach((row) => {
      const id = String(row.user_id ?? "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      userIds.push(id);
    });
  }

  userIds = userIds.slice(0, limitUsers);
  const properties = await fetchPropertiesForRanking();
  let processedUsers = 0;
  let generatedRows = 0;

  for (const userId of userIds) {
    const result = await rebuildRecommendationsForUser(userId, {
      topN,
      lookbackDays,
      properties,
    });
    if (!result.ok) continue;
    processedUsers += 1;
    generatedRows += result.created;
  }

  return { processedUsers, generatedRows };
}
