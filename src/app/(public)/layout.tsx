import Navbar from "@/components/ui/Navbar";
import RostomyiaFooter from "@/components/ui/RostomyiaFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden">{children}</main>
      <RostomyiaFooter />
    </>
  );
}
