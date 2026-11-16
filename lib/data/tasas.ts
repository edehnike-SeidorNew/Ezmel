import { isMockMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { TASAS_POR_DEFECTO, TIPOS_CLIENTE, type Tasas, type TipoCliente } from "@/lib/tasas/tipos";

interface FilaTasas {
  tipo_cliente: string;
  interes_1_semana: number | string;
  interes_adicional_semana: number | string;
  max_semanas: number | string;
  redondeo_cuota: number | string;
  gastos_otorgamiento: number | string;
  iva: number | string;
  tabla_manual: unknown;
  updated_at: string | null;
}

/** Sólo deja las semanas con un interés numérico (la base ya valida, pero esto viene de afuera). */
function limpiarTablaManual(valor: unknown): Record<string, number> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const limpia: Record<string, number> = {};
  for (const [semana, interes] of Object.entries(valor as Record<string, unknown>)) {
    const n = Number(interes);
    if (/^\d{1,2}$/.test(semana) && Number.isFinite(n) && n >= 0) limpia[semana] = n;
  }
  return limpia;
}

function filaATasas(f: FilaTasas, tipo: TipoCliente): Tasas {
  return {
    tipo,
    interes1Semana: Number(f.interes_1_semana),
    interesAdicionalSemana: Number(f.interes_adicional_semana),
    maxSemanas: Number(f.max_semanas),
    redondeoCuota: Number(f.redondeo_cuota),
    gastosOtorgamiento: Number(f.gastos_otorgamiento),
    iva: Number(f.iva),
    tablaManual: limpiarTablaManual(f.tabla_manual),
    actualizadoEn: f.updated_at,
  };
}

/**
 * Tasas de clientes nuevos y antiguos del tenant del usuario (RLS: sólo ve las de su empresa). Si falta alguna
 * fila, o no hay base conectada (modo demo), se usan las tasas iniciales de los Excel.
 */
export async function obtenerTasas(): Promise<Record<TipoCliente, Tasas>> {
  if (isMockMode()) return TASAS_POR_DEFECTO;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasas")
    .select(
      "tipo_cliente, interes_1_semana, interes_adicional_semana, max_semanas, redondeo_cuota, gastos_otorgamiento, iva, tabla_manual, updated_at"
    );
  if (error) {
    // PGRST205: la tabla todavía no existe en la base (falta correr el esquema actualizado). Se usan las tasas
    // iniciales sin hacer ruido; cualquier otro error sí se registra.
    if (error.code !== "PGRST205") console.error("[tasas] No se pudieron leer las tasas:", error.message);
    return TASAS_POR_DEFECTO;
  }

  const filas = (data ?? []) as FilaTasas[];
  const resultado = { ...TASAS_POR_DEFECTO };
  for (const tipo of TIPOS_CLIENTE) {
    const fila = filas.find((f) => f.tipo_cliente === tipo);
    if (fila) resultado[tipo] = filaATasas(fila, tipo);
  }
  return resultado;
}
