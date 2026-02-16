"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import RostomyiaFooter from "@/components/ui/RostomyiaFooter";

export default function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <RostomyiaFooter />
    </>
  );
}

