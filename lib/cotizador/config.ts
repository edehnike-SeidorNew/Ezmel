/**
 * Parámetros del cotizador. Salen de la hoja "Tasas" del Excel "Cotizador EzMel - Clientes nuevos".
 * Para cambiar condiciones se modifica este archivo (y se vuelve a desplegar).
 */
export const COTIZADOR_CONFIG = {
  /** Interés total del préstamo a 1 semana (0,40 = 40%). */
  interes1Semana: 0.4,
  /** Interés total a 16 semanas (1,20 = 120%). El interés crece parejo entre la semana 1 y la 16. */
  interes16Semanas: 1.2,
  /** Máximo de plazo, medido en semanas (16 semanas = 8 quincenas = 4 meses). */
  maxSemanas: 16,
  /** Redondeo de la cuota hacia arriba, en múltiplos de $ (1 = al peso). */
  redondeoCuota: 1,
  /** Gastos de otorgamiento como fracción del monto (para el CFT). 0 = sin gastos. */
  gastosOtorgamiento: 0,
  /** IVA sobre intereses: va incluido en la cuota. */
  iva: 0.21,
} as const;

export type Modalidad = "semanal" | "quincenal" | "mensual";

export const MODALIDADES: Record<
  Modalidad,
  { label: string; semanasPorCuota: number; diasPorCuota: number; unidad: [string, string] }
> = {
  semanal: { label: "Semanal", semanasPorCuota: 1, diasPorCuota: 7, unidad: ["semana", "semanas"] },
  quincenal: { label: "Quincenal", semanasPorCuota: 2, diasPorCuota: 15, unidad: ["quincena", "quincenas"] },
  mensual: { label: "Mensual", semanasPorCuota: 4, diasPorCuota: 30, unidad: ["mes", "meses"] },
};

/** Máximo de cuotas por modalidad: 16 semanales, 8 quincenales o 4 mensuales. */
export function maxCuotas(modalidad: Modalidad): number {
  return Math.floor(COTIZADOR_CONFIG.maxSemanas / MODALIDADES[modalidad].semanasPorCuota);
}
