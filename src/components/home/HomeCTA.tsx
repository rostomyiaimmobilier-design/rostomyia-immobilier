const WHATSAPP = "https://wa.me/213556195427";

export default function HomeCTA({ lang }: { lang: "fr" | "ar" }) {
  const waLink =
    lang === "ar"
      ? `${WHATSAPP}?text=${encodeURIComponent("السلام عليكم Rostomyia، أريد نشر عقار أو حجز زيارة.")}`
      : `${WHATSAPP}?text=${encodeURIComponent("Bonjour Rostomyia, je souhaite publier un bien ou réserver une visite.")}`;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="relative overflow-hidden rounded-[28px] bg-white/70 p-7 backdrop-blur md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-20" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-2xl">
              {lang === "ar"
                ? "هل لديك عقار للبيع أو للكراء؟"
                : "Vous avez un bien à vendre ou à louer ?"}
            </h3>
            <p className="mt-2 text-sm text-black/60">
              {lang === "ar"
                ? "أرسل التفاصيل وسنرد بسرعة."
                : "Envoyez les détails — réponse rapide."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl bg-[rgb(var(--navy))] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              {lang === "ar" ? "واتساب" : "WhatsApp"}
            </a>

            <a
              href="/deposer"
              className="inline-flex items-center justify-center rounded-2xl bg-white/85 px-5 py-3 text-sm font-medium text-[rgb(var(--navy))] backdrop-blur transition hover:bg-white"
            >
              {lang === "ar" ? "أضف عقارك" : "Déposer un bien"}
            </a>

            <a
              href="/visite"
              className="inline-flex items-center justify-center rounded-2xl bg-white/60 px-5 py-3 text-sm font-medium text-black/70 backdrop-blur transition hover:bg-white/80"
            >
              {lang === "ar" ? "احجز زيارة" : "Réserver une visite"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
