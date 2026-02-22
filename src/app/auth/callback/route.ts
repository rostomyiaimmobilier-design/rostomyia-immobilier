import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toSafePath(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

function redirectTo(path: string, requestUrl: URL) {
  return NextResponse.redirect(new URL(path, requestUrl.origin), { status: 303 });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = toSafePath(requestUrl.searchParams.get("next"));

  if (!code) {
    return redirectTo(next ?? "/auth/login", requestUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectTo("/auth/login", requestUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/auth/login", requestUrl);
  }

  const userMeta = (user.user_metadata ?? {}) as {
    account_type?: string;
    agency_status?: string;
  };

  if (userMeta.account_type === "agency") {
    if ((userMeta.agency_status ?? "pending") === "active") {
      return redirectTo("/agency/dashboard", requestUrl);
    }
    return redirectTo("/agency/signup/success", requestUrl);
  }

  return redirectTo(next ?? "/account", requestUrl);
}

