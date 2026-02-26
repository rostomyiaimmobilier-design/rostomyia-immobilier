import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";
import { ensureDefaults } from "@/lib/site-builder/defaults";

const footerLinkSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(240),
});

const footerColumnSchema = z.object({
  title: z.string().min(1).max(80),
  links: z.array(footerLinkSchema).default([]),
});

const socialSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(240),
});

const updateSettingsSchema = z.object({
  brandName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().max(280).nullable().optional(),
  primaryColor: z.string().max(40).optional(),
  secondaryColor: z.string().max(40).optional(),
  accentColor: z.string().max(40).optional(),
  headingFont: z.string().max(120).nullable().optional(),
  bodyFont: z.string().max(120).nullable().optional(),
  copyrightText: z.string().max(220).nullable().optional(),
  footerColumns: z.array(footerColumnSchema).optional(),
  socials: z.array(socialSchema).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  await ensureDefaults();
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    await ensureDefaults();

    const parsed = updateSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const input = parsed.data;
    const settings = await prisma.siteSettings.update({
      where: { id: "default" },
      data: {
        brandName: input.brandName,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        accentColor: input.accentColor,
        headingFont: input.headingFont,
        bodyFont: input.bodyFont,
        copyrightText: input.copyrightText,
        footerColumns: input.footerColumns,
        socials: input.socials,
      },
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}

