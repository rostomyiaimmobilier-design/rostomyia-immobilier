import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const isAdmin = await hasAdminAccess(supabase, user);
  if (isAdmin) redirect("/admin/protected/profile");

  const accountType = String(user.user_metadata?.account_type ?? "")
    .trim()
    .toLowerCase();
  if (accountType === "agency") redirect("/agency/login");
  if (accountType === "admin" || accountType === "super_admin") redirect("/admin/login");

  const safeMetadata = JSON.parse(JSON.stringify(user.user_metadata ?? {})) as Record<string, unknown>;

  return (
    <AccountClient
      user={{
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        metadata: safeMetadata,
      }}
    />
  );
}
