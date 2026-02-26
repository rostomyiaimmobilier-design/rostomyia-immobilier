import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";

export const SITE_ADMIN_COOKIE = "site_admin_session";

function getAdminPassword() {
  return process.env.SITE_ADMIN_PASSWORD?.trim() || "change-me";
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function verifySiteAdminPassword(input: string) {
  const expected = hashValue(getAdminPassword());
  const actual = hashValue(input.trim());
  return safeEquals(expected, actual);
}

function expectedSessionToken() {
  return hashValue(`site-admin:${getAdminPassword()}`);
}

export function setSiteAdminSession(response: NextResponse) {
  response.cookies.set({
    name: SITE_ADMIN_COOKIE,
    value: expectedSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSiteAdminSession(response: NextResponse) {
  response.cookies.set({
    name: SITE_ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function hasSiteAdminSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SITE_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return safeEquals(token, expectedSessionToken());
}

export async function isSiteAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SITE_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return safeEquals(token, expectedSessionToken());
}

export async function requireSiteAdminAuth(redirectTo = "/site-admin/login") {
  const authenticated = await isSiteAdminAuthenticated();
  if (!authenticated) {
    redirect(redirectTo);
  }
}
