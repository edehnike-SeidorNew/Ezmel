import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ password: z.string().min(8).max(72) });

/** Cambia la contraseña de quien tiene una sesión activa (la que abre el link de recuperación). */
export async function POST(request: Request) {
  if (isMockMode()) {
    return NextResponse.json({ error: "En modo demo no hay contraseñas" }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Usá una contraseña de al menos 8 caracteres." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "El enlace venció. Pedí uno nuevo desde el login." }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") {
      return NextResponse.json({ error: "La contraseña es muy débil. Usá una más larga y variada." }, { status: 400 });
    }
    if (error.code === "same_password") {
      return NextResponse.json({ error: "La nueva contraseña tiene que ser distinta de la actual." }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
