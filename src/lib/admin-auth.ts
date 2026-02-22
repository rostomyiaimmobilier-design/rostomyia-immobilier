type AuthUserLike = {
  id: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null;

function isTruthy(value: unknown) {
  if (value === true) return true;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return false;
}

function isAdminRole(value: unknown) {
  if (typeof value !== "string") return false;
  const role = value.toLowerCase();
  return role === "admin" || role === "super_admin";
}

export function isAdminFromMetadata(user: AuthUserLike) {
  if (!user) return false;

  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  if (isTruthy(userMeta.is_admin) || isTruthy(appMeta.is_admin)) return true;
  if (isAdminRole(userMeta.role) || isAdminRole(appMeta.role)) return true;
  if (isAdminRole(userMeta.account_type)) return true;

  const appRoles = appMeta.roles;
  if (Array.isArray(appRoles)) {
    return appRoles.some((x) => isAdminRole(x));
  }

  return false;
}

export async function hasAdminAccess(
  supabase: {
    from: (table: string) => any;
  },
  user: AuthUserLike
) {
  if (!user) return false;

  const result = (await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()) as {
      data: { is_admin?: boolean | null } | null;
      error: { message?: string } | null;
    };
  const { data: profile, error } = result;

  if (!error && profile?.is_admin) return true;
  return isAdminFromMetadata(user);
}
