"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOwnerLeadStatus(id: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("owner_leads")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads/owners");
}

export async function updateViewingRequestStatus(id: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("viewing_requests")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads/visits");
}
