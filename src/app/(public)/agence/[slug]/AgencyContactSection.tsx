import type { ContactSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import StorefrontLeadForm from "./StorefrontLeadForm";
import type { AgencyStorefrontData } from "./storefront-data";

export default function AgencyContactSection({
  content,
  data,
}: {
  content: ContactSectionContent;
  data: AgencyStorefrontData;
}) {
  const email = content.email || data.contactEmail;
  const phone = content.phone || data.contactPhone;
  const address = content.address || data.agencyAddress;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <h2
            data-select-kind="slot"
            data-select-id="contact-headline"
            data-select-type="headline"
            data-select-path="contact.title"
            data-slot="text"
            className="text-3xl font-semibold text-slate-900"
          >
            {content.headline}
          </h2>
          {content.intro ? (
            <p
              data-select-kind="slot"
              data-select-id="contact-intro"
              data-select-type="intro"
              data-select-path="contact.intro"
              data-slot="text"
              className="text-slate-600"
            >
              {content.intro}
            </p>
          ) : null}
          <div className="grid gap-3 text-sm text-slate-700">
            {email ? (
              <a
                href={`mailto:${email}`}
                data-select-kind="component"
                data-select-id="contact-email"
                data-select-type="contact-email"
                data-select-path="contact.email"
                data-slot="link"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-medium transition hover:bg-slate-100"
              >
                <Mail size={14} />
                {email}
              </a>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone}`}
                data-select-kind="component"
                data-select-id="contact-phone"
                data-select-type="contact-phone"
                data-select-path="contact.phone"
                data-slot="link"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-medium transition hover:bg-slate-100"
              >
                <Phone size={14} />
                {phone}
              </a>
            ) : null}
            {data.whatsappHref ? (
              <a
                href={data.whatsappHref}
                target="_blank"
                rel="noreferrer"
                data-select-kind="component"
                data-select-id="contact-whatsapp"
                data-select-type="contact-whatsapp"
                data-select-path="contact.whatsapp"
                data-slot="link"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-medium transition hover:bg-slate-100"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            ) : null}
            {address ? (
              <div
                data-select-kind="component"
                data-select-id="contact-address"
                data-select-type="contact-address"
                data-select-path="contact.address"
                data-slot="text"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-medium"
              >
                <MapPin size={14} />
                {address}
              </div>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <StorefrontLeadForm slug={data.slug} brandPrimaryColor={data.brandPrimaryColor} />
        </Reveal>
      </div>
    </section>
  );
}
