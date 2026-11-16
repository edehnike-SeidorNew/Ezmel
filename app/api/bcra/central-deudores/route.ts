import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/guards";
import { cuitValido, soloDigitosCuit } from "@/lib/bcra/cuit";
import {
  denominacionDe,
  normalizarActual,
  normalizarCheques,
  normalizarHistorica,
} from "@/lib/bcra/normalizar";
import type { ConsultaDeudores, Parte } from "@/lib/bcra/tipos";

/**
 * Consulta la Central de Deudores del BCRA (API pública v1.0) desde el servidor: el navegador no puede
 * llamarla directo (CORS) y así los datos pasan por la plataforma, que exige sesión, tenant y rol (ver proxy.ts y lib/auth/guards.ts).
 * No se guarda nada de lo consultado.
 */
// Ruta tal como figura en el manual oficial (APIs Públicas, Central de Deudores v1.0). Sin autenticación.
const BASE = "https://api.bcra.gob.ar/CentralDeDeudores/v1.0";
const TIMEOUT_MS = 15_000;

type Respuesta = { estado: "ok"; cuerpo: unknown } | { estado: "sin-registros" } | { estado: "error"; mensaje: string };

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Un pedido al BCRA, con un reintento si falla la conexión o el servicio está saturado. */
async function pedir(ruta: string, cuit: string): Promise<Respuesta> {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await fetch(`${BASE}/${ruta}/${cuit}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      // El BCRA responde 404 cuando no hay registros: no es un error.
      if (r.status === 404) return { estado: "sin-registros" };
      if (r.ok) return { estado: "ok", cuerpo: await r.json() };
      if (r.status === 429 || r.status >= 500) {
        await esperar(600);
        continue;
      }
      return { estado: "error", mensaje: `El BCRA respondió con un error (${r.status}).` };
    } catch {
      if (intento === 1) return { estado: "error", mensaje: "No se pudo conectar con el BCRA." };
      await esperar(600);
    }
  }
  return { estado: "error", mensaje: "El BCRA está saturado. Probá de nuevo en un momento." };
}

function parte<T>(respuesta: Respuesta, normalizar: (cuerpo: unknown) => T | null): Parte<T> {
  if (respuesta.estado !== "ok") return respuesta;
  const datos = normalizar(respuesta.cuerpo);
  return datos === null ? { estado: "sin-registros" } : { estado: "ok", datos };
}

export async function GET(request: Request) {
  const auth = await authorize("documentos:leer");
  if (!auth.ok) return auth.response;

  const cuit = soloDigitosCuit(new URL(request.url).searchParams.get("cuit") ?? "");
  if (!cuitValido(cuit)) {
    return NextResponse.json({ error: "El CUIT / CUIL no es válido. Revisá los 11 dígitos." }, { status: 400 });
  }

  const [actual, historica, cheques] = await Promise.all([
    pedir("Deudas", cuit),
    pedir("Deudas/Historicas", cuit),
    pedir("Deudas/ChequesRechazados", cuit),
  ]);

  const consulta: ConsultaDeudores = {
    identificacion: cuit,
    denominacion:
      [actual, historica, cheques]
        .map((r) => (r.estado === "ok" ? denominacionDe(r.cuerpo) : null))
        .find((d) => d !== null) ?? null,
    consultadoEn: new Date().toISOString(),
    actual: parte(actual, normalizarActual),
    historica: parte(historica, normalizarHistorica),
    cheques: parte(cheques, normalizarCheques),
  };

  const todoFallo = [consulta.actual, consulta.historica, consulta.cheques].every((p) => p.estado === "error");
  return NextResponse.json(todoFallo ? { error: "No se pudo consultar el BCRA. Probá de nuevo en un momento." } : consulta, {
    status: todoFallo ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
