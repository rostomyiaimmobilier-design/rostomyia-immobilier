import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ is_admin: false, is_read_only: false, can_write: false });
  }

  const access = await getAdminAccess(supabase, user);
  return NextResponse.json({
    is_admin: access.isAdmin,
    is_read_only: access.isReadOnly,
    can_write: access.canWrite,
  });
}
