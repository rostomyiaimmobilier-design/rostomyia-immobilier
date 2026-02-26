import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Facebook,
  Globe2,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Phone,
  MessageCircle,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export type PremiumFooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

export type PremiumSocialLink = {
  label: string;
  href: string;
};

type PremiumFooterProps = {
  brandName: string;
  logoUrl?: string | null;
  description: string;
  columns: PremiumFooterColumn[];
  socials: PremiumSocialLink[];
  copyrightText: string;
};

function socialIcon(label: string, href: string): LucideIcon {
  const key = `${label} ${href}`.toLowerCase();
  if (key.includes("instagram")) return Instagram;
  if (key.includes("facebook")) return Facebook;
  if (key.includes("linkedin")) return Linkedin;
  if (key.includes("tiktok")) return Music2;
  if (key.includes("twitter") || key.includes("x.com")) return Twitter;
  if (key.includes("youtube") || key.includes("youtu.be")) return Youtube;
  return Globe2;
}

function contactLinkIcon(label: string, href: string): LucideIcon {
  const key = `${label} ${href}`.toLowerCase();
  if (href.startsWith("mailto:") || key.includes("@")) return Mail;
  if (href.startsWith("tel:")) return Phone;
  if (key.includes("whatsapp") || key.includes("wa.me")) return MessageCircle;
  if (key.includes("address") || key.includes("adresse")) return MapPin;
  return Globe2;
}

function normalizeSocialHref(raw: string) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return null;
}

function isUnsafeScheme(raw: string) {
  return /^(javascript|data|vbscript):/i.test(String(raw || "").trim());
}

export default function PremiumFooter({
  brandName,
  logoUrl,
  description,
  columns,
  socials,
  copyrightText,
}: PremiumFooterProps) {
  const monogram = brandName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "PM";
  const socialItems = socials
    .map((item) => {
      const label = String(item.label || "").trim() || "Social";
      const rawHref = String(item.href || "").trim();
      const normalizedHref = normalizeSocialHref(rawHref);
      const unsafe = isUnsafeScheme(rawHref);
      const href = normalizedHref || rawHref;
      const clickable = Boolean(href) && !unsafe;
      if (!label && !rawHref) return null;
      return {
        label,
        href,
        clickable,
      };
    })
    .filter((item): item is { label: string; href: string; clickable: boolean } => Boolean(item));
  const visibleSocialItems =
    socialItems.length > 0
      ? socialItems
      : [
          { label: "Facebook", href: "", clickable: false },
          { label: "Instagram", href: "", clickable: false },
          { label: "TikTok", href: "", clickable: false },
        ];

  return (
    <footer className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_40%,#eef2f7_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-slate-300/35 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="rounded-2xl bg-white/55 p-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
                <Image
                  src={logoUrl}
                  alt={brandName}
                  width={40}
                  height={40}
                  className="h-10 w-10 object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold tracking-wide text-white">
                {monogram}
              </div>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {brandName}
            </p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">{description}</p>
          {visibleSocialItems.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {visibleSocialItems.map((social) => {
                const Icon = socialIcon(social.label, social.href);
                if (!social.clickable) {
                  return (
                    <span
                      key={`${social.label}-${social.href || "empty"}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500"
                    >
                      <Icon size={13} />
                      {social.label}
                    </span>
                  );
                }

                return (
                    <a
                    key={`${social.label}-${social.href || "empty"}`}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
                  >
                    <Icon size={13} />
                    {social.label}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>

        {columns.map((column) => (
          <div
            key={column.title}
            className="rounded-2xl bg-white/45 p-6"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.href}`}>
                  {column.title.toLowerCase().includes("contact") ? (
                    (() => {
                      const Icon = contactLinkIcon(link.label, link.href);
                      return (
                        <Link
                          className="inline-flex items-center gap-2 text-sm text-slate-700 transition hover:text-slate-900"
                          href={link.href}
                        >
                          <Icon size={13} />
                          {link.label}
                        </Link>
                      );
                    })()
                  ) : (
                  <Link
                    className="inline-flex items-center gap-1.5 text-sm text-slate-700 transition hover:gap-2 hover:text-slate-900"
                    href={link.href}
                  >
                    {link.label}
                    <ArrowUpRight size={12} />
                  </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs text-slate-500">{copyrightText}</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          Crafted with precision
        </p>
      </div>
    </footer>
  );
}
