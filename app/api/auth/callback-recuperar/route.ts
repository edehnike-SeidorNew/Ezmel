import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/site-url";

/** Destino del link del mail de "restablecer contraseña": abre la sesión y lleva a elegir la nueva. */
export async function GET(request: Request) {
  const site = getSiteUrl(request);
  const code = new URL(request.url).searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${site}/restablecer`);
  }
  return NextResponse.redirect(`${site}/login?error=recuperar`);
}
