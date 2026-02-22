import AdminPageLoader from "@/components/admin/AdminPageLoader";

export default function DepotTiersLoading() {
  return (
    <AdminPageLoader
      badge="Depot tiers"
      title="Chargement des depots tiers"
      subtitle="Verification des demandes..."
      cards={4}
      rows={3}
    />
  );
}
