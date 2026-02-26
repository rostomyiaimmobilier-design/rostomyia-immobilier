import type { ContactSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";
import ContactForm from "@/components/site-builder/public/ContactForm";

export default function ContactSection({
  content,
  pageSlug,
}: {
  content: ContactSectionContent;
  pageSlug?: string;
}) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <h2 className="text-3xl font-semibold text-slate-900">{content.headline}</h2>
          {content.intro ? <p className="text-slate-600">{content.intro}</p> : null}
          <div className="space-y-3 text-sm text-slate-700">
            {content.email ? <p>Email: {content.email}</p> : null}
            {content.phone ? <p>Phone: {content.phone}</p> : null}
            {content.address ? <p>Address: {content.address}</p> : null}
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <ContactForm submitLabel={content.submitLabel} pageSlug={pageSlug} />
        </Reveal>
      </div>
    </section>
  );
}
