import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/site-url";

const DOMINIO_NO_PERMITIDO = "Solo se pueden registrar cuentas con el email de la empresa.";

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().max(120).optional(),
});

/**
 * Registro con email y contraseña. Crear la cuenta NO da acceso a la app: para entrar hay que
 * haber sido invitado a un tenant con ese mismo email (ver supabase/schema.sql), y el email
 * tiene que estar confirmado.
 */
export async function POST(request: Request) {
  if (isMockMode()) {
    return NextResponse.json({ error: "En modo demo no hace falta registrarse" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá el email y usá una contraseña de al menos 8 caracteres." }, { status: 400 });
  }

  const supabase = await createClient();

  // Sólo se registran emails de la empresa. La base lo exige igual (trigger sobre auth.users);
  // acá se consulta antes para dar un mensaje claro en vez de un error genérico.
  const { data: permitido } = await supabase.rpc("is_email_allowed", { p_email: parsed.data.email });
  if (permitido === false) {
    return NextResponse.json({ error: DOMINIO_NO_PERMITIDO }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl(request)}/api/auth/callback`,
      data: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return NextResponse.json({ error: "La contraseña es muy débil. Usá una más larga y variada." }, { status: 400 });
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo en unos minutos." }, { status: 429 });
    }
    // El trigger de la base rechaza dominios no autorizados con este mensaje genérico de Supabase Auth.
    if (/database error saving new user/i.test(error.message)) {
      return NextResponse.json({ error: DOMINIO_NO_PERMITIDO }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 400 });
  }

  // Si el proyecto exige confirmar el email (recomendado), no hay sesión hasta que lo confirme.
  // La respuesta es la misma exista o no el email, para no revelar quién tiene cuenta.
  return NextResponse.json({ ok: true, needsConfirmation: !data.session });
}
