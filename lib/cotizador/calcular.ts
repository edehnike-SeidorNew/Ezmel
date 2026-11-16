import { COTIZADOR_CONFIG, MODALIDADES, maxCuotas, type Modalidad } from "./config";

export interface CuotaCronograma {
  numero: number;
  /** Fecha de vencimiento, "AAAA-MM-DD". */
  fecha: string;
  monto: number;
}

export interface Cotizacion {
  monto: number;
  modalidad: Modalidad;
  cuotas: number;
  valorCuota: number;
  totalAPagar: number;
  /** Interés sobre el monto (0,987 = 98,7%). */
  interes: number;
  interesPesos: number;
  ivaPesos: number;
  /** Tasas en fracción (0,44 = 44%). Null si no se pudieron calcular. */
  tna: number | null;
  tea: number | null;
  tem: number | null;
  cft: number | null;
  cronograma: CuotaCronograma[];
}

/** Interés total del plan según las semanas que dura (tabla de la hoja "Tasas": crece parejo). */
export function interesPorSemanas(semanas: number): number {
  const { interes1Semana, interes16Semanas, maxSemanas } = COTIZADOR_CONFIG;
  const adicionalPorSemana = (interes16Semanas - interes1Semana) / (maxSemanas - 1);
  return interes1Semana + (semanas - 1) * adicionalPorSemana;
}

/** Redondeo hacia arriba al múltiplo indicado (CEILING de Excel), sin errores de coma flotante. */
function techo(valor: number, multiplo: number): number {
  const limpio = Math.round(valor * 1e6) / 1e6;
  return Math.ceil(limpio / multiplo) * multiplo;
}

/**
 * Tasa por período de un sistema francés (cuota fija): resuelve pv = cuota * (1 - (1 + r)^-n) / r.
 * Equivale a RATE(n; -cuota; pv) de Excel. Devuelve null si no hay solución.
 */
export function tasaPorPeriodo(n: number, cuota: number, pv: number): number | null {
  if (!(n > 0) || !(cuota > 0) || !(pv > 0)) return null;
  if (cuota * n <= pv) return null; // sin interés

  const valorActual = (r: number) => (r === 0 ? cuota * n : (cuota * (1 - Math.pow(1 + r, -n))) / r);

  let bajo = 1e-12;
  let alto = 1;
  while (valorActual(alto) > pv && alto < 1e9) alto *= 2;
  if (valorActual(alto) > pv) return null;

  for (let i = 0; i < 300; i++) {
    const medio = (bajo + alto) / 2;
    if (valorActual(medio) > pv) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

/** "AAAA-MM-DD" a partir de año, mes (0-11) y día, acomodando el día al último del mes si hace falta. */
function aISO(anio: number, mes: number, dia: number): string {
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(anio, mes, Math.min(dia, ultimoDia)));
  return d.toISOString().slice(0, 10);
}

/** Suma meses como EDATE de Excel (el 31 + 1 mes = último día del mes siguiente). */
export function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const total = m - 1 + meses;
  return aISO(a + Math.floor(total / 12), ((total % 12) + 12) % 12, d);
}

export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** ¿El plan está dentro de lo permitido? (monto positivo, cuotas enteras y plazo máximo). */
export function planValido(monto: number, modalidad: Modalidad, cuotas: number): boolean {
  return (
    Number.isFinite(monto) &&
    monto > 0 &&
    Number.isInteger(cuotas) &&
    cuotas >= 1 &&
    cuotas <= maxCuotas(modalidad)
  );
}

/**
 * Cotiza un préstamo con las mismas fórmulas del Excel. `fechaInicio` ("AAAA-MM-DD") es la fecha
 * del préstamo: la primera cuota vence una modalidad después (7 o 15 días, o 1 mes).
 */
export function cotizar(
  monto: number,
  modalidad: Modalidad,
  cuotas: number,
  fechaInicio: string
): Cotizacion | null {
  if (!planValido(monto, modalidad, cuotas)) return null;

  const { redondeoCuota, gastosOtorgamiento, iva } = COTIZADOR_CONFIG;
  const { semanasPorCuota, diasPorCuota } = MODALIDADES[modalidad];

  const interesPlan = interesPorSemanas(cuotas * semanasPorCuota);
  const valorCuota = techo((monto * (1 + interesPlan)) / cuotas, redondeoCuota);
  const totalAPagar = valorCuota * cuotas;
  const interesPesos = (totalAPagar - monto) / (1 + iva);

  const r = tasaPorPeriodo(cuotas, valorCuota, monto);
  const rCft = tasaPorPeriodo(cuotas, valorCuota, monto * (1 - gastosOtorgamiento));
  const anual = (tasa: number | null, dias: number) => (tasa === null ? null : Math.pow(1 + tasa, 365 / dias) - 1);

  const cronograma: CuotaCronograma[] = Array.from({ length: cuotas }, (_, i) => ({
    numero: i + 1,
    fecha: modalidad === "mensual" ? sumarMeses(fechaInicio, i + 1) : sumarDias(fechaInicio, (i + 1) * diasPorCuota),
    monto: valorCuota,
  }));

  return {
    monto,
    modalidad,
    cuotas,
    valorCuota,
    totalAPagar,
    interes: totalAPagar / monto - 1,
    interesPesos,
    ivaPesos: interesPesos * iva,
    tna: r === null ? null : (r * 365) / diasPorCuota,
    tea: anual(r, diasPorCuota),
    tem: r === null ? null : Math.pow(1 + r, 30 / diasPorCuota) - 1,
    cft: anual(rCft, diasPorCuota),
    cronograma,
  };
}
