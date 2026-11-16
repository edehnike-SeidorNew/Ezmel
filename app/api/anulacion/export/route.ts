import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/guards";
import { buildAnulacionContenido } from "@/lib/anulacion/contenido";
import { formatosPedidos, responderDescarga, slugify } from "@/lib/export/exportarDocumento";
import { anulacionSchema } from "@/lib/validation/anulacionSchema";

export async function POST(request: Request) {
  const auth = await authorize("documentos:crear");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const parsed = anulacionSchema.safeParse(body.datos);
  if (!parsed.success) {
    return NextResponse.json({ error: "Faltan datos de la anulación" }, { status: 400 });
  }

  const formatos = formatosPedidos(body.formats);
  if (!formatos) {
    return NextResponse.json({ error: "Elegí al menos un formato" }, { status: 400 });
  }

  const baseName = `Anulacion_${slugify(parsed.data.mutuarioNombre, "anulacion")}`;
  return responderDescarga(buildAnulacionContenido(parsed.data), formatos, baseName);
}
