"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { sendAgencyLifecycleEmail } from "@/lib/agency-email";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  canTransitionStatus,
  getActivationMissingFields,
  isValidEmail,
  isValidPhone,
  normalizeServiceAreas,
  normalizeStatus,
  normalizeText,
  parseOptionalInt,
} from "./validation";

const AGENCIES_PATH = "/admin/protected/agencies";

function normalizeFold(input: string | null | undefined) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isMissingActivityLogTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_activity_logs") && m.includes("does not exist");
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

async function writeAgencyActivity(
  admin: ReturnType<typeof supabaseAdmin>,
  payload: {
    agency_user_id: string;
    actor_user_id: string | null;
    action: string;
    previous_status?: string | null;
    next_status?: string | null;
    details?: Record<string, unknown>;
  }
) {
  const { error } = await admin.from("agency_activity_logs").insert({
    agency_user_id: payload.agency_user_id,
    actor_user_id: payload.actor_user_id,
    action: payload.action,
    previous_status: payload.previous_status ?? null,
    next_status: payload.next_status ?? null,
    details: payload.details ?? {},
  });

  if (error && !isMissingActivityLogTable(error.message)) {
    throw new Error(error.message);
  }
}

async function assertCreateRateLimit(
  admin: ReturnType<typeof supabaseAdmin>,
  actorUserId: string
) {
  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("agency_activity_logs")
    .select("id", { head: true, count: "exact" })
    .eq("actor_user_id", actorUserId)
    .eq("action", "agency_created")
    .gte("created_at", windowStart);

  if (error) {
    if (isMissingActivityLogTable(error.message)) return;
    throw new Error(error.message);
  }

  if ((count ?? 0) >= 5) {
    throw new Error("Limite de creation atteinte: maximum 5 agences en 10 minutes.");
  }
}

async function assertNoAgencyDuplicate(
  admin: ReturnType<typeof supabaseAdmin>,
  agencyName: string,
  city: string
) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) return;

  const nameFold = normalizeFold(agencyName);
  const cityFold = normalizeFold(city);
  const existing = (data.users ?? []).find((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    if (String(meta.account_type ?? "") !== "agency") return false;
    const n = normalizeFold(String(meta.agency_name ?? ""));
    const c = normalizeFold(String(meta.agency_city ?? ""));
    return n === nameFold && c === cityFold;
  });

  if (existing) {
    throw new Error("Une agence similaire existe deja (meme nom et ville).");
  }
}

export async function updateAgencyStatus(userId: string, status: string) {
  try {
    const actor = await ensureAdmin();

    const normalizedStatus =
      status === "suspended" ? "suspended" : status === "pending" ? "pending" : "active";
    const admin = supabaseAdmin();

    const { data: userData, error: getError } = await admin.auth.admin.getUserById(userId);
    if (getError || !userData.user) throw new Error(getError?.message || "Agence introuvable.");

    const target = userData.user;
    const currentMeta = (target.user_metadata ?? {}) as Record<string, unknown>;
    const currentStatus = String(currentMeta.agency_status ?? "pending");

    if (String(currentMeta.account_type ?? "") !== "agency") {
      throw new Error("Ce compte n'est pas une agence.");
    }

    if (!canTransitionStatus(normalizeStatus(currentStatus), normalizedStatus)) {
      throw new Error("Transition refusee: une agence active ne peut pas revenir en pending.");
    }

    if (normalizedStatus === "active") {
      if (!target.email_confirmed_at) {
        throw new Error("Activation impossible: email non confirme.");
      }

      const missing = getActivationMissingFields(currentMeta);

      if (missing.length > 0) {
        throw new Error(`Activation impossible: profil incomplet (${missing.join(", ")}).`);
      }
    }

    const now = new Date().toISOString();
    const nextMeta = {
      ...currentMeta,
      account_type: "agency",
      agency_status: normalizedStatus,
      agency_status_updated_at: now,
      ...(normalizedStatus === "active" ? { agency_activated_at: now } : {}),
    };

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: nextMeta,
    });

    if (updateError) throw new Error(updateError.message);

    await writeAgencyActivity(admin, {
      agency_user_id: userId,
      actor_user_id: actor.id,
      action: "agency_status_updated",
      previous_status: currentStatus,
      next_status: normalizedStatus,
      details: {
        email: target.email ?? null,
      },
    });

    if ((target.email ?? "").trim() && currentStatus !== normalizedStatus) {
      const agencyName = String(currentMeta.agency_name ?? target.email ?? "Agence");
      const emailType =
        normalizedStatus === "active"
          ? "agency_status_active"
          : normalizedStatus === "suspended"
            ? "agency_status_suspended"
            : "agency_status_pending";

      const notify = await sendAgencyLifecycleEmail({
        to: target.email as string,
        agencyName,
        type: emailType,
      });

      await writeAgencyActivity(admin, {
        agency_user_id: userId,
        actor_user_id: actor.id,
        action: "agency_email_notification",
        previous_status: currentStatus,
        next_status: normalizedStatus,
        details: {
          type: emailType,
          sent: notify.sent,
          reason: notify.reason ?? null,
        },
      });
    }

    revalidatePath(AGENCIES_PATH);
    redirect(`${AGENCIES_PATH}?success=${encodeURIComponent("Statut agence mis a jour.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${AGENCIES_PATH}?error=${encodeURIComponent(message)}`);
  }
}

export async function updateAgencyDetails(formData: FormData) {
  try {
    const actor = await ensureAdmin();

    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) throw new Error("Agence introuvable.");

    const agencyName = normalizeText(formData.get("agency_name"));
    const managerName = normalizeText(formData.get("agency_manager_name"));
    const phone = normalizeText(formData.get("agency_phone"));
    const city = normalizeText(formData.get("agency_city"));
    const address = normalizeText(formData.get("agency_address"));
    const whatsapp = normalizeText(formData.get("agency_whatsapp"));
    const website = normalizeText(formData.get("agency_website"));
    const serviceAreas = normalizeServiceAreas(formData.get("agency_service_areas"));
    const yearsExperience = parseOptionalInt(formData.get("agency_years_experience"));

    if (!agencyName || !managerName || !phone || !city || !address) {
      throw new Error("Champs obligatoires manquants: nom agence, responsable, telephone, ville, adresse.");
    }

    if (!isValidPhone(phone)) {
      throw new Error("Telephone invalide.");
    }

    const admin = supabaseAdmin();
    const { data: userData, error: getError } = await admin.auth.admin.getUserById(userId);
    if (getError || !userData.user) throw new Error(getError?.message || "Agence introuvable.");

    const target = userData.user;
    const currentMeta = (target.user_metadata ?? {}) as Record<string, unknown>;
    if (String(currentMeta.account_type ?? "") !== "agency") {
      throw new Error("Ce compte n'est pas une agence.");
    }

    const nextMeta = {
      ...currentMeta,
      account_type: "agency",
      agency_name: agencyName,
      agency_manager_name: managerName,
      agency_phone: phone,
      agency_city: city,
      agency_address: address,
      agency_whatsapp: whatsapp,
      agency_website: website,
      agency_service_areas: serviceAreas,
      agency_years_experience: yearsExperience,
      agency_profile_updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: nextMeta,
    });
    if (updateError) throw new Error(updateError.message);

    await writeAgencyActivity(admin, {
      agency_user_id: userId,
      actor_user_id: actor.id,
      action: "agency_details_updated",
      previous_status: String(currentMeta.agency_status ?? "pending"),
      next_status: String(currentMeta.agency_status ?? "pending"),
      details: {
        updated_fields: [
          "agency_name",
          "agency_manager_name",
          "agency_phone",
          "agency_city",
          "agency_address",
          "agency_whatsapp",
          "agency_website",
          "agency_service_areas",
          "agency_years_experience",
        ],
      },
    });

    revalidatePath(AGENCIES_PATH);
    redirect(`${AGENCIES_PATH}?success=${encodeURIComponent("Details agence mis a jour.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${AGENCIES_PATH}?error=${encodeURIComponent(message)}`);
  }
}

export async function createAgencyByAdmin(formData: FormData) {
  try {
    const actor = await ensureAdmin();

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const agencyName = normalizeText(formData.get("agency_name"));
    const managerName = normalizeText(formData.get("agency_manager_name"));
    const phone = normalizeText(formData.get("agency_phone"));
    const city = normalizeText(formData.get("agency_city"));
    const address = normalizeText(formData.get("agency_address"));
    const whatsapp = normalizeText(formData.get("agency_whatsapp"));
    const website = normalizeText(formData.get("agency_website"));
    const serviceAreas = normalizeServiceAreas(formData.get("agency_service_areas"));
    const yearsExperience = parseOptionalInt(formData.get("agency_years_experience"));
    const initialStatus = normalizeStatus(formData.get("agency_status"));

    if (!email || !password || !agencyName || !managerName || !phone || !city || !address) {
      throw new Error("Champs obligatoires manquants (email, mot de passe, agence, responsable, telephone, ville, adresse).");
    }
    if (!isValidEmail(email)) throw new Error("Email invalide.");
    if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caracteres.");
    if (!isValidPhone(phone)) throw new Error("Telephone invalide.");

    const admin = supabaseAdmin();
    await assertCreateRateLimit(admin, actor.id);
    await assertNoAgencyDuplicate(admin, agencyName, city);

    const now = new Date().toISOString();

    const metadata: Record<string, unknown> = {
      account_type: "agency",
      agency_status: initialStatus,
      full_name: managerName,
      phone,
      company_name: agencyName,
      city,
      address,
      service_areas: serviceAreas,
      years_experience: yearsExperience,
      agency_name: agencyName,
      agency_manager_name: managerName,
      agency_phone: phone,
      agency_whatsapp: whatsapp,
      agency_city: city,
      agency_address: address,
      agency_website: website,
      agency_service_areas: serviceAreas,
      agency_years_experience: yearsExperience,
      profile_completed_at: now,
      agency_profile_updated_at: now,
      agency_status_updated_at: now,
      agency_created_by_admin: true,
    };

    if (initialStatus === "active") {
      metadata.agency_activated_at = now;
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      const m = (error.message || "").toLowerCase();
      const isDuplicate =
        m.includes("users_email_partial_key") ||
        m.includes("duplicate key") ||
        m.includes("already registered") ||
        m.includes("already exists");

      if (isDuplicate) {
        throw new Error("Cette adresse email existe deja.");
      }
      throw new Error(error.message);
    }

    const createdUserId = created.user?.id;
    if (!createdUserId) throw new Error("Creation agence echouee.");

    await writeAgencyActivity(admin, {
      agency_user_id: createdUserId,
      actor_user_id: actor.id,
      action: "agency_created",
      previous_status: null,
      next_status: initialStatus,
      details: {
        email,
        by_admin: true,
      },
    });

    const notify = await sendAgencyLifecycleEmail({
      to: email,
      agencyName,
      type: "agency_created_by_admin",
    });

    await writeAgencyActivity(admin, {
      agency_user_id: createdUserId,
      actor_user_id: actor.id,
      action: "agency_email_notification",
      previous_status: null,
      next_status: initialStatus,
      details: {
        type: "agency_created_by_admin",
        sent: notify.sent,
        reason: notify.reason ?? null,
      },
    });

    revalidatePath(AGENCIES_PATH);
    redirect(`${AGENCIES_PATH}?success=${encodeURIComponent("Nouvelle agence creee avec succes.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    redirect(`${AGENCIES_PATH}?error=${encodeURIComponent(message)}`);
  }
}
