import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  email?: string;
  redirectTo?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeRedirectTo(raw: string | undefined) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return null;
  }
}

function detectAccountType(user: { user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null }) {
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
    if (role === "agency" || role === "admin" || role === "admin_read_only" || role === "super_admin" || role === "user") {
      return role;
    }
  }

  if (String(userMeta.agency_status ?? "").trim() || String(userMeta.agency_name ?? "").trim()) {
    return "agency";
  }

  return "user";
}

async function findUserByEmail(email: string) {
  const admin = supabaseAdmin();
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((item) => String(item.email ?? "").trim().toLowerCase() === email);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const redirectTo = normalizeRedirectTo(body?.redirectTo);
    const options = redirectTo ? { emailRedirectTo: redirectTo } : undefined;

    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      return NextResponse.json(
        { code: "account_not_found", error: "Aucun compte agence trouve pour cet email." },
        { status: 404 }
      );
    }

    const accountType = detectAccountType(existingUser);
    if (accountType !== "agency") {
      return NextResponse.json(
        { code: "not_agency_account", error: "Ce compte n'est pas un compte agence." },
        { status: 409 }
      );
    }

    if (existingUser.email_confirmed_at) {
      return NextResponse.json(
        { code: "email_already_confirmed", error: "Email deja confirme. Connectez-vous a votre espace agence." },
        { status: 409 }
      );
    }

    const admin = supabaseAdmin();
    const resend = await admin.auth.resend({
      type: "signup",
      email,
      options,
    });

    if (!resend.error) {
      return NextResponse.json({ ok: true, method: "resend" });
    }

    return NextResponse.json(
      { code: "resend_failed", error: resend.error.message || "Impossible d'envoyer le code OTP." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Impossible d'envoyer le code OTP.";
    return NextResponse.json({ code: "unexpected_error", error: message }, { status: 500 });
  }
}
