import AdminPageLoader from "@/components/admin/AdminPageLoader";

export default function AdminProtectedLoading() {
  return <AdminPageLoader badge="Admin" title="Chargement du dashboard admin" subtitle="Initialisation..." />;
}
