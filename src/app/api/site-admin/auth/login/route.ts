import { NextResponse } from "next/server";
import { z } from "zod";
import { setSiteAdminSession, verifySiteAdminPassword } from "@/lib/site-builder/auth";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    if (!verifySiteAdminPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    setSiteAdminSession(response);
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to login." }, { status: 500 });
  }
}
