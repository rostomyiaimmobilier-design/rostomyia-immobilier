import AdminPageLoader from "@/components/admin/AdminPageLoader";

export default function AgenciesLoading() {
  return (
    <AdminPageLoader
      badge="Agences"
      title="Chargement des agences"
      subtitle="Recuperation des comptes et statuts..."
      cards={4}
      rows={4}
    />
  );
}
