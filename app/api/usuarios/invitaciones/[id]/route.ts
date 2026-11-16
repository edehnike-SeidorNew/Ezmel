import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/guards";
import { respuestaDeError } from "@/lib/usuarios/errores";
import { isMockMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Elimina una invitación pendiente. Solo el superadministrador (la política RLS también lo exige). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize("usuarios:gestionar");
  if (!auth.ok) return auth.response;
  if (isMockMode()) {
    return NextResponse.json({ error: "En modo demo no se administran usuarios." }, { status: 400 });
  }

  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) {
    return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", id.data)
    .is("accepted_at", null)
    .select("id");
  if (error) return respuestaDeError(error);
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "La invitación ya no existe o ya fue aceptada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
