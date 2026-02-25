import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminNotificationInput = {
  eventType: string;
  title: string;
  body?: string | null;
  href?: string | null;
  iconKey?: string | null;
  entityTable?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeSeconds?: number;
};

function isMissingAdminNotificationsTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("admin_notifications") && (m.includes("does not exist") || m.includes("relation"));
}

function toOptionalText(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

export async function notifyAdminEvent(input: AdminNotificationInput) {
  const admin = supabaseAdmin();

  const eventType = toOptionalText(input.eventType) ?? "event";
  const title = toOptionalText(input.title) ?? "Nouvel evenement";
  const entityTable = toOptionalText(input.entityTable);
  const entityId = toOptionalText(input.entityId);
  const dedupeSeconds = Math.max(0, Number(input.dedupeSeconds ?? 10));

  if (dedupeSeconds > 0) {
    let query = admin
      .from("admin_notifications")
      .select("id")
      .eq("event_type", eventType)
      .gte("created_at", new Date(Date.now() - dedupeSeconds * 1000).toISOString())
      .order("id", { ascending: false })
      .limit(1);

    if (entityTable) query = query.eq("entity_table", entityTable);
    if (entityId) query = query.eq("entity_id", entityId);

    const recent = await query;
    if (recent.error) {
      if (isMissingAdminNotificationsTable(recent.error.message)) return false;
      console.error("[admin-notify] dedupe query failed:", recent.error.message);
      return false;
    }
    if ((recent.data ?? []).length > 0) return false;
  }

  const { error } = await admin.from("admin_notifications").insert({
    event_type: eventType,
    icon_key: toOptionalText(input.iconKey) ?? "bell",
    title,
    body: toOptionalText(input.body),
    href: toOptionalText(input.href) ?? "/admin/protected",
    entity_table: entityTable,
    entity_id: entityId,
    metadata: input.metadata ?? {},
  });

  if (error) {
    if (isMissingAdminNotificationsTable(error.message)) return false;
    console.error("[admin-notify] insert failed:", error.message);
    return false;
  }

  return true;
}
