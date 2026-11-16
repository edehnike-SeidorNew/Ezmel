import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { respuestaDeError } from "@/lib/usuarios/errores";
import { isMockMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
// Se cambia una sola cosa por pedido: el rol o el estado (activo/desactivado).
const cuerpoSchema = z.union([z.object({ rol: z.enum(ROLES) }), z.object({ activo: z.boolean() })]);

/** Cambia el rol o activa/desactiva a un miembro. Solo el superadministrador; el usuario principal no se modifica. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize("usuarios:gestionar");
  if (!auth.ok) return auth.response;
  if (isMockMode()) {
    return NextResponse.json({ error: "En modo demo no se administran usuarios." }, { status: 400 });
  }

  const id = idSchema.safeParse((await params).id);
  const cuerpo = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !cuerpo.success) {
    return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } =
    "rol" in cuerpo.data
      ? await supabase.rpc("set_member_role", { p_user_id: id.data, p_role: cuerpo.data.rol })
      : await supabase.rpc("set_member_active", { p_user_id: id.data, p_active: cuerpo.data.activo });
  if (error) return respuestaDeError(error);

  return NextResponse.json({ ok: true });
}
