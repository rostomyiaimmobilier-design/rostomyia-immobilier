"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { hasAdminAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

const USERS_PATH = "/admin/protected/users";
const AGENCIES_PATH = "/admin/protected/agencies";

type UserRole = "super_admin" | "admin" | "user" | "agency";

type AuthUserLike = {
  id: string;
  email?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

function publicSupabaseAuthClient() {
  const { url, anonKey, configured } = getPublicSupabaseEnv();
  if (!configured) {
    throw new Error("Configuration Supabase publique manquante.");
  }

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sendUserConfirmationOtp(email: string) {
  const client = publicSupabaseAuthClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    return `Utilisateur cree, mais envoi OTP impossible: ${error.message}`;
  }
  return null;
}

function isTruthy(value: unknown) {
  if (value === true) return true;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return false;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRole(value: unknown): UserRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  if (role === "agency") return "agency";
  return "user";
}

function readRole(user: AuthUserLike): UserRole {
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const accountType = String(userMeta.account_type ?? "").trim().toLowerCase();
  if (accountType === "agency") return "agency";
  if (accountType === "super_admin") return "super_admin";
  if (accountType === "admin") return "admin";

  const roleCandidates = [
    userMeta.role,
    appMeta.role,
    Array.isArray(appMeta.roles) ? appMeta.roles[0] : null,
  ];

  for (const candidate of roleCandidates) {
    const role = String(candidate ?? "").trim().toLowerCase();
    if (role === "agency") return "agency";
    if (role === "super_admin") return "super_admin";
    if (role === "admin") return "admin";
    if (role === "user") return "user";
  }

  if (isTruthy(userMeta.is_admin) || isTruthy(appMeta.is_admin)) return "admin";
  return "user";
}

function isPrivilegedRole(role: UserRole) {
  return role === "admin" || role === "super_admin";
}

function isCurrentlySuspended(user: Pick<AuthUserLike, "banned_until">) {
  const bannedUntil = String(user.banned_until ?? "").trim();
  if (!bannedUntil) return false;
  const ts = new Date(bannedUntil).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts > Date.now();
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  const isAdmin = await hasAdminAccess(supabase, user);
  if (!isAdmin) throw new Error("Forbidden");

  return user;
}

async function listAllUsers(admin: ReturnType<typeof supabaseAdmin>) {
  const perPage = 200;
  const maxPages = 15;
  const users: AuthUserLike[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const chunk = (data.users ?? []) as AuthUserLike[];
    users.push(...chunk);

    if (chunk.length < perPage) break;
  }

  return users;
}

async function assertRoleTransitionSafety(
  admin: ReturnType<typeof supabaseAdmin>,
  target: AuthUserLike,
  nextRole: UserRole
) {
  const currentRole = readRole(target);
  const demotingSuperAdmin = currentRole === "super_admin" && nextRole !== "super_admin";
  const demotingPrivileged = isPrivilegedRole(currentRole) && !isPrivilegedRole(nextRole);
  if (!demotingSuperAdmin && !demotingPrivileged) return;

  const users = await listAllUsers(admin);

  if (demotingSuperAdmin) {
    const superAdminCount = users.filter((u) => readRole(u) === "super_admin").length;
    if (superAdminCount <= 1) {
      throw new Error("Impossible de retirer le dernier compte super_admin.");
    }
  }

  if (demotingPrivileged) {
    const privilegedCount = users.filter((u) => isPrivilegedRole(readRole(u))).length;
    if (privilegedCount <= 1) {
      throw new Error("Impossible de retirer le dernier compte admin/super_admin.");
    }
  }
}

function buildNextMetadata(
  currentUserMeta: Record<string, unknown>,
  currentAppMeta: Record<string, unknown>,
  role: UserRole
) {
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isAgency = role === "agency";

  const nextUserMeta: Record<string, unknown> = {
    ...currentUserMeta,
    role,
    account_type: isAgency ? "agency" : isSuperAdmin ? "super_admin" : isAdmin ? "admin" : "user",
    is_admin: isAdmin,
  };

  if (isAgency) {
    nextUserMeta.agency_status = String(currentUserMeta.agency_status ?? "pending").trim() || "pending";
  } else {
    nextUserMeta.agency_status = null;
  }

  const nextAppMeta: Record<string, unknown> = {
    ...currentAppMeta,
    role,
    roles: [role],
    is_admin: isAdmin,
  };

  return { nextUserMeta, nextAppMeta, isAdmin };
}

async function syncProfileAdminFlag(
  admin: ReturnType<typeof supabaseAdmin>,
  input: { userId: string; email: string | null; isAdmin: boolean }
) {
  const payload: { id: string; email?: string | null; is_admin: boolean } = {
    id: input.userId,
    is_admin: input.isAdmin,
  };

  if (input.email) payload.email = input.email;

  const { error } = await admin.from("profiles").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function createManagedUser(formData: FormData) {
  try {
    await ensureAdmin();

    const email = normalizeText(formData.get("email")).toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = normalizeRole(formData.get("role"));

    if (role === "super_admin") {
      throw new Error("Le role super_admin ne peut etre cree que depuis la base de donnees.");
    }

    if (!email || !password) {
      throw new Error("Email et mot de passe sont obligatoires.");
    }
    if (!isValidEmail(email)) {
      throw new Error("Email invalide.");
    }
    if (password.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caracteres.");
    }

    const admin = supabaseAdmin();
    const { nextUserMeta, nextAppMeta, isAdmin } = buildNextMetadata({}, {}, role);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: nextUserMeta,
      app_metadata: nextAppMeta,
    });

    if (error) {
      const m = (error.message || "").toLowerCase();
      const isDuplicate =
        m.includes("users_email_partial_key") ||
        m.includes("duplicate key") ||
        m.includes("already registered") ||
        m.includes("already exists");

      if (isDuplicate) throw new Error("Cette adresse email existe deja.");
      throw new Error(error.message);
    }

    const created = (data.user ?? null) as AuthUserLike | null;
    if (!created?.id) throw new Error("Creation utilisateur echouee.");

    await syncProfileAdminFlag(admin, {
      userId: created.id,
      email: created.email ?? email,
      isAdmin,
    });

    let successMessage = "Utilisateur cree. Confirmation email requise avant connexion.";
    if (role === "user") {
      const otpWarning = await sendUserConfirmationOtp(email);
      successMessage = otpWarning ?? "Utilisateur cree. OTP de confirmation envoye par email.";
    }

    revalidatePath(USERS_PATH);
    revalidatePath("/admin/protected");
    if (role === "agency") revalidatePath(AGENCIES_PATH);
    redirect(`${USERS_PATH}?success=${encodeURIComponent(successMessage)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${USERS_PATH}?error=${encodeURIComponent(message)}`);
  }
}

export async function updateManagedUserRole(formData: FormData) {
  try {
    await ensureAdmin();

    const userId = normalizeText(formData.get("user_id"));
    const role = normalizeRole(formData.get("role"));
    if (!userId) throw new Error("Utilisateur introuvable.");

    if (role === "super_admin") {
      throw new Error("Le role super_admin ne peut etre attribue que depuis la base de donnees.");
    }

    const admin = supabaseAdmin();
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !userRes.user) throw new Error(userErr?.message || "Utilisateur introuvable.");

    const target = userRes.user as AuthUserLike;
    await assertRoleTransitionSafety(admin, target, role);

    const currentUserMeta = (target.user_metadata ?? {}) as Record<string, unknown>;
    const currentAppMeta = (target.app_metadata ?? {}) as Record<string, unknown>;
    const { nextUserMeta, nextAppMeta, isAdmin } = buildNextMetadata(currentUserMeta, currentAppMeta, role);

    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: nextUserMeta,
      app_metadata: nextAppMeta,
    });
    if (updateErr) throw new Error(updateErr.message);

    await syncProfileAdminFlag(admin, {
      userId,
      email: target.email ?? null,
      isAdmin,
    });

    revalidatePath(USERS_PATH);
    revalidatePath("/admin/protected");
    revalidatePath(AGENCIES_PATH);
    redirect(`${USERS_PATH}?success=${encodeURIComponent("Role utilisateur mis a jour.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${USERS_PATH}?error=${encodeURIComponent(message)}`);
  }
}

async function assertCanSuspendTarget(
  admin: ReturnType<typeof supabaseAdmin>,
  actorId: string,
  target: AuthUserLike
) {
  if (target.id === actorId) {
    throw new Error("Impossible de suspendre votre propre compte.");
  }

  const targetRole = readRole(target);
  if (targetRole === "super_admin") {
    throw new Error("Le compte super_admin ne peut pas etre suspendu depuis ce panneau.");
  }

  if (!isPrivilegedRole(targetRole)) return;

  const users = await listAllUsers(admin);
  const activePrivilegedCount = users.filter(
    (u) => isPrivilegedRole(readRole(u)) && !isCurrentlySuspended(u)
  ).length;

  if (activePrivilegedCount <= 1) {
    throw new Error("Impossible de suspendre le dernier compte admin/super_admin actif.");
  }
}

export async function suspendManagedUser(formData: FormData) {
  try {
    const actor = await ensureAdmin();
    const userId = normalizeText(formData.get("user_id"));
    if (!userId) throw new Error("Utilisateur introuvable.");

    const admin = supabaseAdmin();
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !userRes.user) throw new Error(userErr?.message || "Utilisateur introuvable.");

    const target = userRes.user as AuthUserLike;
    await assertCanSuspendTarget(admin, actor.id, target);

    const { error: suspendError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (suspendError) throw new Error(suspendError.message);

    revalidatePath(USERS_PATH);
    revalidatePath("/admin/protected");
    redirect(`${USERS_PATH}?success=${encodeURIComponent("Compte utilisateur suspendu.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${USERS_PATH}?error=${encodeURIComponent(message)}`);
  }
}

export async function unsuspendManagedUser(formData: FormData) {
  try {
    await ensureAdmin();
    const userId = normalizeText(formData.get("user_id"));
    if (!userId) throw new Error("Utilisateur introuvable.");

    const admin = supabaseAdmin();
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !userRes.user) throw new Error(userErr?.message || "Utilisateur introuvable.");

    const target = userRes.user as AuthUserLike;
    const targetRole = readRole(target);
    if (targetRole === "super_admin") {
      throw new Error("Le compte super_admin ne peut pas etre modifie depuis ce panneau.");
    }

    const { error: unsuspendError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (unsuspendError) throw new Error(unsuspendError.message);

    revalidatePath(USERS_PATH);
    revalidatePath("/admin/protected");
    redirect(`${USERS_PATH}?success=${encodeURIComponent("Compte utilisateur reactive.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${USERS_PATH}?error=${encodeURIComponent(message)}`);
  }
}
