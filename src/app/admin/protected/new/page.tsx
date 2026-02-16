import NewPropertyForm from "@/components/admin/NewPropertyForm";

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

export default async function AdminNewPage({ searchParams }: AdminNewPageProps) {
  const params = (await searchParams) ?? {};
  const initialRef = normalizeRefParam(params.ref);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau bien</h1>
        <p className="text-sm text-slate-600">
          Creez un bien et uploadez ses photos (Supabase Storage).
        </p>
      </div>

      <div className="mt-6">
        <NewPropertyForm initialRef={initialRef} />
      </div>
    </main>
  );
}
