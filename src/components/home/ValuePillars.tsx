type Pillar = {
  t: string;
  d: string;
  points: [string, string];
  stat: string;
  statLabel: string;
};

const copy: Record<
  "fr" | "ar",
  { title: string; sub: string; items: Pillar[] }
> = {
  fr: {
    title: "Pourquoi Rostomyia",
    sub: "Un service immobilier complet, structure autour de standards clairs et d'un suivi constant.",
    items: [
      {
        t: "Selection plus exigeante",
        d: "Chaque bien passe un controle qualite avant publication.",
        points: ["Verification des photos et infos cles", "Positionnement prix selon marche local"],
        stat: "100%",
        statLabel: "Fiches revues",
      },
      {
        t: "Dossiers plus solides",
        d: "Les pieces essentielles sont controlees pour reduire les risques.",
        points: ["Documents proprietaire verifies", "Trajectoire de transaction plus claire"],
        stat: "24h",
        statLabel: "Delai de retour moyen",
      },
      {
        t: "Visites plus efficaces",
        d: "Organisation rapide avec un cadre de visite structure.",
        points: ["Creation de creneaux adaptes", "Compte rendu apres visite"],
        stat: "+3",
        statLabel: "Formats de visite",
      },
      {
        t: "Accompagnement de A a Z",
        d: "De la premiere prise de contact jusqu'a la signature finale.",
        points: ["Suivi negotiation et administratif", "Support continu vendeur et acheteur"],
        stat: "1",
        statLabel: "Interlocuteur dedie",
      },
    ],
  },
  ar: {
    title: "لماذا روستوميا",
    sub: "خدمة عقارية متكاملة مبنية على معايير واضحة ومتابعة مستمرة.",
    items: [
      {
        t: "انتقاء ادق",
        d: "كل عقار يمر بمراجعة جودة قبل النشر.",
        points: ["التحقق من الصور والمعلومات الاساسية", "تقييم السعر حسب السوق المحلي"],
        stat: "100%",
        statLabel: "ملفات تمت مراجعتها",
      },
      {
        t: "ملفات اقوى",
        d: "فحص الوثائق الاساسية لتقليل المخاطر.",
        points: ["التحقق من وثائق الملكية", "وضوح اكبر لمسار الصفقة"],
        stat: "24h",
        statLabel: "متوسط وقت الرد",
      },
      {
        t: "زيارات اكثر فاعلية",
        d: "تنظيم سريع مع طريقة زيارة واضحة.",
        points: ["مواعيد مرنة حسب وقتك", "ملاحظات بعد كل زيارة"],
        stat: "+3",
        statLabel: "انماط زيارة",
      },
      {
        t: "مرافقة كاملة",
        d: "من اول تواصل الى غاية التوقيع.",
        points: ["متابعة التفاوض والاداري", "دعم مستمر للبائع والمشتري"],
        stat: "1",
        statLabel: "مستشار مخصص",
      },
    ],
  },
};

export default function ValuePillars({ lang }: { lang: "fr" | "ar" }) {
  const t = copy[lang];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="max-w-3xl">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-3xl">
          {t.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/60 md:text-base">
          {t.sub}
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {t.items.map((x) => (
          <article key={x.t} className="rounded-2xl bg-white/58 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-[rgb(var(--navy))] md:text-lg">
                {x.t}
              </h3>
              <div className="rounded-xl bg-[rgb(var(--gold))]/25 px-3 py-2 text-right">
                <div className="text-sm font-semibold text-[rgb(var(--navy))]">{x.stat}</div>
                <div className="text-[11px] text-black/60">{x.statLabel}</div>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-black/65">{x.d}</p>

            <div className="mt-4 space-y-2 text-xs text-black/65">
              <div className="rounded-xl bg-white/55 px-3 py-2">{x.points[0]}</div>
              <div className="rounded-xl bg-white/55 px-3 py-2">{x.points[1]}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
