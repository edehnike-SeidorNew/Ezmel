import type { TextSegment } from "@/lib/contrato/buildContratoBlocks";
import { fechaPartes } from "@/lib/format/dateEs";

/** Texto fijo del documento. */
export const t = (text: string): TextSegment => ({ text });
/** Dato completado (personal, monto, fecha): va en negrita. */
export const b = (text: string): TextSegment => ({ text, bold: true });
/** Relleno de guiones al final del renglón, como en los contratos de EzMel. */
export const relleno = (): TextSegment => t(" —" + "-".repeat(45));

const dosDecimales = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sinDecimales = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "$ 132.445,00": siempre con centavos (formato del contrato de mutuo y de la refinanciación). */
export const moneyCentavos = (n: number) => `$ ${dosDecimales.format(n || 0)}`;

/** "$ 200.000" si es entero, "$ 144.000,50" si tiene centavos (formato del convenio de anulación). */
export const moneySinCentavos = (n: number) => {
  const centavos = Math.round((n || 0) * 100);
  return `$ ${(centavos % 100 === 0 ? sinDecimales : dosDecimales).format(centavos / 100)}`;
};

/** "437,19 %" */
export const pct = (n: number) => `${dosDecimales.format(n)} %`;

/** "14 días del mes de octubre de 2026" */
export function diasDelMes(iso: string): string {
  const f = fechaPartes(iso);
  return `${f.dia} días del mes de ${f.mes.toLowerCase()} de ${f.anio}`;
}

const ORDINALES = [
  "PRIMERA",
  "SEGUNDA",
  "TERCERA",
  "CUARTA",
  "QUINTA",
  "SEXTA",
  "SÉPTIMA",
  "OCTAVA",
  "NOVENA",
  "DÉCIMA",
  "DÉCIMO PRIMERA",
  "DÉCIMO SEGUNDA",
  "DÉCIMO TERCERA",
  "DÉCIMO CUARTA",
  "DÉCIMO QUINTA",
  "DÉCIMO SEXTA",
  "DÉCIMO SÉPTIMA",
  "DÉCIMO OCTAVA",
  "DÉCIMO NOVENA",
  "VIGÉSIMA",
];

/** Ordinal femenino de la cláusula n (1 = "PRIMERA"). */
export const ordinal = (n: number) => ORDINALES[n - 1] ?? `${n}ª`;
