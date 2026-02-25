"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MatchMode = "exact" | "prefix";

function normalizePath(path: string) {
  if (!path) return "/";
  if (path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function isPathActive(currentPath: string, href: string, matchMode: MatchMode) {
  const current = normalizePath(currentPath);
  const target = normalizePath(href);
  if (matchMode === "exact") return current === target;
  return current === target || current.startsWith(`${target}/`);
}

export default function ActiveAdminLink({
  href,
  className,
  activeClassName,
  matchMode = "prefix",
  children,
  onClick,
}: {
  href: string;
  className: string;
  activeClassName: string;
  matchMode?: MatchMode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = isPathActive(pathname || "/", href, matchMode);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${className} ${active ? activeClassName : ""}`.trim()}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
