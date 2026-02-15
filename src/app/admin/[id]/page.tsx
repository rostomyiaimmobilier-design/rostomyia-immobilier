import { redirect } from "next/navigation";

export default async function AdminPropertyLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/protected/${id}`);
}
