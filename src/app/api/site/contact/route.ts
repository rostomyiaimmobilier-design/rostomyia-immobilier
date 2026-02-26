import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(180),
  phone: z.string().max(60).optional().or(z.literal("")),
  message: z.string().min(10).max(4000),
  pageSlug: z.string().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = contactSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const data = parsed.data;

    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message,
        pageSlug: data.pageSlug || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to submit contact form." }, { status: 500 });
  }
}
