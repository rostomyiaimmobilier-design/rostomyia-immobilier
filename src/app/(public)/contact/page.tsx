// src/app/contact/page.tsx
import { cookies } from "next/headers";
import ContactClient from "./ContactClient";
import { LANG_COOKIE_KEY, LEGACY_LANG_COOKIE_KEY, langToDir, normalizeLang, type Lang } from "@/lib/i18n";

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return normalizeLang(
    cookieStore.get(LANG_COOKIE_KEY)?.value ?? cookieStore.get(LEGACY_LANG_COOKIE_KEY)?.value
  );
}

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const lang = await getLang();
  const dir = langToDir(lang);

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
