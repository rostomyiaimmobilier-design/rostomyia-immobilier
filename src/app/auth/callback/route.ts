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

function detectAccountType(
  user: { user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null }
) {
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    userMeta.account_type,
    userMeta.role,
    appMeta.account_type,
    appMeta.role,
    Array.isArray(appMeta.roles) ? appMeta.roles[0] : null,
  ];
  for (const candidate of candidates) {
    const role = String(candidate ?? "").trim().toLowerCase();
    if (role === "agency" || role === "admin" || role === "admin_read_only" || role === "super_admin") {
      return role;
    }
  }
  if (String(userMeta.agency_status ?? "").trim() || String(userMeta.agency_name ?? "").trim()) {
    return "agency";
  }
  return "user";
}

function resolveRedirectPath(
  user: { user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null },
  next: string | null
) {
  const userMeta = (user.user_metadata ?? {}) as {
    agency_status?: string;
  };
  const accountType = detectAccountType(user);

  if (accountType === "agency") {
    const agencyStatus = String(userMeta.agency_status ?? "pending").toLowerCase();
    if (agencyStatus === "active") return "/agency/dashboard";
    return "/agency/onboarding";
  }

  if (accountType === "admin" || accountType === "super_admin" || accountType === "admin_read_only") {
    return "/admin/login";
  }

  return next ?? "/account";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = toSafePath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (!code) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return redirectTo(next ?? "/auth/login", requestUrl);

    const path = resolveRedirectPath(user, next);
    if (path === "/admin/login") {
      await supabase.auth.signOut();
      return redirectTo(path, requestUrl);
    }
    return redirectTo(path, requestUrl);
  }

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
  const path = resolveRedirectPath(user, next);
  if (path === "/admin/login") {
    await supabase.auth.signOut();
    return redirectTo(path, requestUrl);
  }
  return redirectTo(path, requestUrl);
}
