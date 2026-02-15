import NewPropertyForm from "@/components/admin/NewPropertyForm";

export const dynamic = "force-dynamic";

export default function AdminNewPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau bien</h1>
        <p className="text-sm text-slate-600">
          Créez un bien et uploadez ses photos (Supabase Storage).
        </p>
      </div>

      <div className="mt-6">
        <NewPropertyForm />
      </div>
    </main>
  );
}
