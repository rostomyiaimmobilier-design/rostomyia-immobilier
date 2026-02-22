import AdminPageLoader from "@/components/admin/AdminPageLoader";

export default function OwnerLeadsLoading() {
  return (
    <AdminPageLoader
      badge="Owners"
      title="Chargement des leads proprietaires"
      subtitle="Analyse des dossiers..."
      cards={4}
      rows={3}
    />
  );
}
