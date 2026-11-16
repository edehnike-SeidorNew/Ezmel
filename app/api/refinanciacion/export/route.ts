import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/guards";
import { formatosPedidos, responderDescarga, slugify } from "@/lib/export/exportarDocumento";
import { buildRefinanciacionContenido } from "@/lib/refinanciacion/contenido";
import { refinanciacionSchema } from "@/lib/validation/refinanciacionSchema";

export async function POST(request: Request) {
  const auth = await authorize("documentos:crear");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const parsed = refinanciacionSchema.safeParse(body.datos);
  if (!parsed.success) {
    return NextResponse.json({ error: "Faltan datos de la refinanciación" }, { status: 400 });
  }

  const formatos = formatosPedidos(body.formats);
  if (!formatos) {
    return NextResponse.json({ error: "Elegí al menos un formato" }, { status: 400 });
  }

  const baseName = `Refinanciacion_${slugify(parsed.data.deudorNombre, "refinanciacion")}`;
  return responderDescarga(buildRefinanciacionContenido(parsed.data), formatos, baseName);
}
