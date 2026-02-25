import NewPropertyForm from "@/components/admin/NewPropertyForm";
import { getAdminAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminNewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeRefParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeOwnerLeadIdParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/^[0-9a-fA-F-]{36}$/.test(trimmed)) return undefined;
  return trimmed;
}

export default async function AdminNewPage({ searchParams }: AdminNewPageProps) {
  const params = (await searchParams) ?? {};
  const initialRef = normalizeRefParam(params.ref);
  const ownerLeadId = normalizeOwnerLeadIdParam(params.ownerLeadId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = user ? await getAdminAccess(supabase, user) : { canWrite: false };
  const canCreate = access.canWrite === true;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau bien</h1>
        <p className="text-sm text-slate-600">
          Creez un bien et uploadez ses photos (Supabase Storage).
        </p>
      </div>

      <div className="mt-6">
        <NewPropertyForm initialRef={initialRef} ownerLeadId={ownerLeadId} canCreate={canCreate} />
      </div>
    </main>
  );
}
