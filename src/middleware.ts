import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasAdminAccess } from "@/lib/admin-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/images/") ||
    pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|css|js|map|txt|xml)$/i)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (pathname === "/admin/login" || pathname === "/admin/signup") {
      return res;
    }

    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const isAdmin = await hasAdminAccess(supabase, user);
    if (!isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/api/admin/:path*", "/api/admin"],
};
