"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";

export type PremiumNavItem = {
  id: string;
  label: string;
  href: string;
};

type PremiumNavbarProps = {
  brandName: string;
  logoUrl?: string | null;
  homeHref: string;
  navItems: PremiumNavItem[];
  ctaLabel: string;
  ctaHref: string;
  pillLayoutId?: string;
  showLocaleSwitch?: boolean;
};

function isActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === homeHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isInternalPath(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export default function PremiumNavbar({
  brandName,
  logoUrl,
  homeHref,
  navItems,
  ctaLabel,
  ctaHref,
  pillLayoutId = "premium-nav-pill",
  showLocaleSwitch = false,
}: PremiumNavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLang = searchParams.get("lang") === "ar" ? "ar" : "fr";
  const withLang = (lang: "fr" | "ar") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("lang", lang);
    const q = next.toString();
    return `${pathname}${q ? `?${q}` : ""}`;
  };
  const withActiveLang = (href: string) => {
    if (!showLocaleSwitch || !isInternalPath(href)) return href;
    const [pathOnly, queryString = ""] = href.split("?");
    const next = new URLSearchParams(queryString);
    next.set("lang", activeLang);
    const q = next.toString();
    return `${pathOnly}${q ? `?${q}` : ""}`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={withActiveLang(homeHref)} className="flex items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={brandName}
              width={34}
              height={34}
              className="rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
              {brandName.slice(0, 2).toUpperCase() || "AG"}
            </div>
          )}
          <span className="max-w-[12rem] truncate text-sm font-semibold tracking-wide text-slate-900 sm:text-base">
            {brandName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, homeHref);
            return (
              <Link
                key={item.id}
                href={withActiveLang(item.href)}
                className="relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {active ? (
                  <motion.span
                    layoutId={pillLayoutId}
                    className="absolute inset-0 -z-10 rounded-full bg-slate-900 text-white"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                ) : null}
                <span className={active ? "text-white" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {showLocaleSwitch ? (
            <div className="hidden items-center rounded-full border border-slate-200 bg-white p-1 sm:flex">
              <Link
                href={withLang("fr")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                  activeLang === "fr" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                FR
              </Link>
              <Link
                href={withLang("ar")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                  activeLang === "ar" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                AR
              </Link>
            </div>
          ) : null}

          <Link
            href={withActiveLang(ctaHref)}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800 sm:text-sm"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
