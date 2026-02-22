import AdminPageLoader from "@/components/admin/AdminPageLoader";

export default function LeadsLoading() {
  return <AdminPageLoader badge="Leads" title="Chargement du lead center" subtitle="Preparation des modules..." cards={3} rows={3} />;
}
