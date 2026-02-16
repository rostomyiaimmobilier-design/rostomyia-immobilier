// src/app/contact/page.tsx
import { cookies } from "next/headers";
import ContactClient from "./ContactClient";

type Lang = "fr" | "ar";

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value;
  return lang === "ar" ? "ar" : "fr";
}

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const lang = await getLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <main dir={dir} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-10" />
        <div className="absolute -right-52 top-0 h-[620px] w-[620px] rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.7),transparent_50%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
        <ContactClient lang={lang} />
      </div>
    </main>
  );
}
