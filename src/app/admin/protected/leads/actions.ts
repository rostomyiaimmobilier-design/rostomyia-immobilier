"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function isMissingValidationColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  const missingColumn = m.includes("column") && m.includes("does not exist");
  const touchesValidationFields =
    m.includes("validation_note") || m.includes("validated_at") || m.includes("validated_by");
  return missingColumn && touchesValidationFields;
}

export async function updateOwnerLeadStatus(id: string, status: string, validationNote?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedStatus = status.trim() || "new";
  const note = (validationNote || "").trim();
  const isValidated = normalizedStatus === "validated";

  const updatePayload = {
    status: normalizedStatus,
    validation_note: note || null,
    validated_at: isValidated ? new Date().toISOString() : null,
    validated_by: isValidated ? user?.id ?? null : null,
  };

  let { error } = await supabase
    .from("owner_leads")
    .update(updatePayload)
    .eq("id", id);

  if (error && isMissingValidationColumn(error.message)) {
    const fallback = await supabase
      .from("owner_leads")
      .update({ status: normalizedStatus })
      .eq("id", id);
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  revalidatePath("/admin/protected/leads/owners");
  revalidatePath("/admin/leads/owners");

  if (isValidated) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900).toString();
    const ref = `OR-${ts}${rand}`;
    redirect(`/admin/protected/new?ownerLeadId=${encodeURIComponent(id)}&ref=${encodeURIComponent(ref)}`);
  }
}

export async function updateViewingRequestStatus(id: string, status: string) {
  const supabase = await createClient();
  const normalizedStatus = status.trim() || "new";

  const { error } = await supabase
    .from("viewing_requests")
    .update({ status: normalizedStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/protected/leads/visits");
  revalidatePath("/admin/leads/visits");

  if (normalizedStatus === "scheduled") {
    redirect(`/admin/protected/leads/visits/plan/${encodeURIComponent(id)}`);
  }
}
