import { NextResponse } from "next/server";
import { clearSiteAdminSession } from "@/lib/site-builder/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSiteAdminSession(response);
  return response;
}

