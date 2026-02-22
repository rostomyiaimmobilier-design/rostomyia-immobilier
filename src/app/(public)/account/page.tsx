import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

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
