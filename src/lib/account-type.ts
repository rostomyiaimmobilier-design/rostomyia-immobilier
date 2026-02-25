type AuthUserLike = {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null;

function norm(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isRestrictedRole(value: unknown) {
  const role = norm(value);
  return (
    role === "agency" ||
    role === "admin" ||
    role === "admin_read_only" ||
    role === "super_admin" ||
    role === "superadmin"
  );
}

function isTruthy(value: unknown) {
  const v = norm(value);
  return v === "true" || v === "1" || value === true || value === 1;
}

export function isBackofficeAccount(user: AuthUserLike) {
  if (!user) return false;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  if (isRestrictedRole(userMeta.account_type)) return true;
  if (isRestrictedRole(appMeta.account_type)) return true;
  if (isRestrictedRole(userMeta.role)) return true;
  if (isRestrictedRole(appMeta.role)) return true;
  if (isTruthy(userMeta.is_admin) || isTruthy(appMeta.is_admin)) return true;

  const appRoles = appMeta.roles;
  if (Array.isArray(appRoles)) {
    return appRoles.some((x) => isRestrictedRole(x));
  }

  return false;
}
