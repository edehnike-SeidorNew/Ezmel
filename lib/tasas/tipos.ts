import { COTIZADOR_CONFIG } from "@/lib/cotizador/config";

/** Tipos de cliente que tienen su propia hoja de tasas. */
export const TIPOS_CLIENTE = ["nuevo", "antiguo"] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export const ETIQUETA_TIPO: Record<TipoCliente, string> = {
  nuevo: "Clientes nuevos",
  antiguo: "Clientes antiguos",
};

/** Parámetros de tasas de un tipo de cliente (hoja "Tasas" del Excel). Los porcentajes van como fracción: 0,40 = 40 %. */
export interface Tasas {
  tipo: TipoCliente;
  /** Interés total de un préstamo a 1 cuota semanal. */
  interes1Semana: number;
  /** Lo que suma cada semana más: parejo de la semana 1 a la última. */
  interesAdicionalSemana: number;
  /** Largo de la tabla: 16 semanas (clientes nuevos) o 20 (antiguos). */
  maxSemanas: number;
  /** La cuota se redondea hacia arriba a este múltiplo de pesos (1 = al peso). */
  redondeoCuota: number;
  /** Fracción del monto que se descuenta al entregarlo (para el CFT). */
  gastosOtorgamiento: number;
  /** IVA sobre intereses, incluido en la cuota. */
  iva: number;
  /** Intereses escritos a mano para una semana puntual (clave = número de semana). */
  tablaManual: Record<string, number>;
  /** Última modificación (ISO) o null si todavía son los valores iniciales. */
  actualizadoEn: string | null;
}

/**
 * Tasas iniciales, las de los Excel de EzMel. Las de clientes nuevos son las mismas que usan hoy los cotizadores
 * (lib/cotizador/config.ts). Las de clientes antiguos: 30 % a 1 semana y 116 % a 20 semanas.
 */
export const TASAS_POR_DEFECTO: Record<TipoCliente, Tasas> = {
  nuevo: {
    tipo: "nuevo",
    interes1Semana: COTIZADOR_CONFIG.interes1Semana,
    interesAdicionalSemana:
      (COTIZADOR_CONFIG.interes16Semanas - COTIZADOR_CONFIG.interes1Semana) / (COTIZADOR_CONFIG.maxSemanas - 1),
    maxSemanas: COTIZADOR_CONFIG.maxSemanas,
    redondeoCuota: COTIZADOR_CONFIG.redondeoCuota,
    gastosOtorgamiento: COTIZADOR_CONFIG.gastosOtorgamiento,
    iva: COTIZADOR_CONFIG.iva,
    tablaManual: {},
    actualizadoEn: null,
  },
  antiguo: {
    tipo: "antiguo",
    interes1Semana: 0.3,
    interesAdicionalSemana: (1.16 - 0.3) / 19,
    maxSemanas: 20,
    redondeoCuota: COTIZADOR_CONFIG.redondeoCuota,
    gastosOtorgamiento: COTIZADOR_CONFIG.gastosOtorgamiento,
    iva: COTIZADOR_CONFIG.iva,
    tablaManual: {},
    actualizadoEn: null,
  },
};

/** Interés total de un plan de `semana` semanas: el escrito a mano si lo hay, y si no, parejo desde la semana 1. */
export function interesDeSemana(t: Tasas, semana: number): number {
  const manual = t.tablaManual[String(semana)];
  return manual !== undefined ? manual : t.interes1Semana + (semana - 1) * t.interesAdicionalSemana;
}

/** Las filas de la tabla SEMANAS / INTERÉS del Excel. `manual` marca las que se escribieron a mano. */
export function tablaIntereses(t: Tasas): { semana: number; interes: number; manual: boolean }[] {
  return Array.from({ length: t.maxSemanas }, (_, i) => ({
    semana: i + 1,
    interes: interesDeSemana(t, i + 1),
    manual: t.tablaManual[String(i + 1)] !== undefined,
  }));
}

const dec = (digitos: number) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: digitos, maximumFractionDigits: digitos });
const d1 = dec(1);
const d3 = dec(3);
const d0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "40,0%" (un decimal, como la tabla del Excel). */
export const porcentaje1 = (fraccion: number) => `${d1.format(fraccion * 100)}%`;
/** "5,333%" (tres decimales, como el interés adicional por semana). */
export const porcentaje3 = (fraccion: number) => `${d3.format(fraccion * 100)}%`;
/** "21%" si es entero y "4,5%" si no. */
export const porcentajeCorto = (fraccion: number) => {
  const valor = fraccion * 100;
  return Number.isInteger(Math.round(valor * 1000) / 1000) ? `${d0.format(valor)}%` : `${d1.format(valor)}%`;
};
/** "$ 1" */
export const pesosEnteros = (n: number) => `$ ${d0.format(n)}`;
