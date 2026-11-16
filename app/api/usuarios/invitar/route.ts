import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { respuestaDeError } from "@/lib/usuarios/errores";
import { isMockMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  rol: z.enum(ROLES),
});

/** Invita a una persona al tenant con un rol. Solo el superadministrador (la base lo vuelve a verificar). */
export async function POST(request: Request) {
  const auth = await authorize("usuarios:gestionar");
  if (!auth.ok) return auth.response;
  if (isMockMode()) {
    return NextResponse.json({ error: "En modo demo no se administran usuarios." }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá el email y elegí un rol." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_member", { p_email: parsed.data.email, p_role: parsed.data.rol });
  if (error) return respuestaDeError(error);

  return NextResponse.json({ ok: true });
}
