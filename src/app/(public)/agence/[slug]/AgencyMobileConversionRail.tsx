"use client";

import Link from "next/link";
import { MessageCircle, PhoneCall, Sparkles } from "lucide-react";

export default function AgencyMobileConversionRail({
  enabled,
  contactPhone,
  whatsappHref,
  ctaHref,
  ctaLabel,
  brandPrimaryColor,
}: {
  enabled: boolean;
  contactPhone: string;
  whatsappHref: string;
  ctaHref: string;
  ctaLabel: string;
  brandPrimaryColor: string;
}) {
  if (!enabled) return null;
  const telHref = contactPhone ? `tel:${contactPhone}` : "";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
        {telHref ? (
          <a
            href={telHref}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <PhoneCall size={14} />
            Appel
          </a>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
            Appel
          </span>
        )}

        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
            WhatsApp
          </span>
        )}

        {ctaHref ? (
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-center text-xs font-semibold text-white"
            style={{ backgroundColor: brandPrimaryColor }}
          >
            <Sparkles size={14} />
            {ctaLabel || "Action"}
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
            Action
          </span>
        )}
      </div>
    </div>
  );
}

