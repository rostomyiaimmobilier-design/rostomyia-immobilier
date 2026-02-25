type AuthUserLike = {
  id: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null;

type ProfileAdminQueryResult = {
  data: { is_admin?: boolean | null } | null;
  error: { message?: string } | null;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => unknown;
      };
    };
  };
};

function asSupabaseLike(input: unknown): SupabaseLike | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (typeof value.from !== "function") return null;
  return value as unknown as SupabaseLike;
}

function normalizeMetaText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isReadOnlyRoleLabel(value: unknown) {
  const role = normalizeMetaText(value);
  return (
    role === "admin_read_only" ||
    role === "admin_readonly" ||
    role === "read_only_admin" ||
    role === "readonly_admin"
  );
}

function isAdminReadOnlyUser(user: AuthUserLike) {
  if (!user) return false;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const roleCandidates: unknown[] = [
    userMeta.role,
    userMeta.account_type,
    appMeta.role,
    appMeta.account_type,
  ];

  if (Array.isArray(appMeta.roles)) {
    roleCandidates.push(...appMeta.roles);
  }

  return roleCandidates.some((candidate) => isReadOnlyRoleLabel(candidate));
}

export async function getAdminAccess(
  supabase: unknown,
  user: AuthUserLike
) {
  if (!user) return { isAdmin: false, isReadOnly: false, canWrite: false };
  const client = asSupabaseLike(supabase);
  if (!client) return { isAdmin: false, isReadOnly: false, canWrite: false };

  const result = (await client
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()) as {
      data: { is_admin?: boolean | null } | null;
      error: { message?: string } | null;
    } | ProfileAdminQueryResult;
  const { data: profile, error } = result;

  if (error || profile?.is_admin !== true) {
    return { isAdmin: false, isReadOnly: false, canWrite: false };
  }

  const isReadOnly = isAdminReadOnlyUser(user);
  return {
    isAdmin: true,
    isReadOnly,
    canWrite: !isReadOnly,
  };
}

export async function hasAdminAccess(
  supabase: unknown,
  user: AuthUserLike
) {
  const access = await getAdminAccess(supabase, user);
  return access.isAdmin;
}

export async function hasAdminWriteAccess(
  supabase: unknown,
  user: AuthUserLike
) {
  const access = await getAdminAccess(supabase, user);
  return access.canWrite;
}
