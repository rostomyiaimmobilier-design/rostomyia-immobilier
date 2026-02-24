import { redirect } from "next/navigation";

export default function UploadBienRedirectPage() {
  redirect("/agency/dashboard/new");
}
