import AdminPageLoader from "@/components/admin/AdminPageLoader";

export default function ViewingRequestsLoading() {
  return (
    <AdminPageLoader
      badge="Visites"
      title="Chargement des demandes de visite"
      subtitle="Synchronisation des statuts..."
      cards={4}
      rows={3}
    />
  );
}
