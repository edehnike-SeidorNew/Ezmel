import { COTIZADOR_CONFIG } from "../cotizador/config";
import { sumarDias, sumarMeses, tasaPorPeriodo } from "../cotizador/calcular";
import type { ContratoDatos } from "../types/contrato";

/** Una cuota del ANEXO I (Plan de pagos). */
export interface FilaPlan {
  numero: number;
  /** Fecha de vencimiento, "AAAA-MM-DD". */
  vence: string;
  saldoInicial: number;
  amortizacion: number;
  interes: number;
  iva: number;
  cuota: number;
  saldoFinal: number;
}

export interface PlanDePagos {
  filas: FilaPlan[];
  totales: { amortizacion: number; interes: number; iva: number; cuota: number };
}

type DatosPlan = Pick<
  ContratoDatos,
  "montoPrestado" | "cantidadCuotas" | "importeCuota" | "periodicidadPago" | "fechaPrimeraCuota"
> & { fechaContrato?: string };

const DIAS_ENTRE_CUOTAS = { semanal: 7, quincenal: 15 } as const;

const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** "AAAA-MM-DD" válido (el formulario ya lo valida; acá se evita calcular con basura). */
const esFecha = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso));

/**
 * Plan de pagos del ANEXO I, con las mismas fórmulas del Excel del cotizador: sistema francés con cuota fija
 * que incluye el IVA sobre intereses. La tasa por período sale de RATE(cuotas; cuota; capital) —que ya incluye el
 * IVA— y se le quita el IVA para obtener la tasa de interés pura:
 *
 *   interés = saldo × tasa      IVA = interés × 21%      amortización = cuota − interés − IVA
 *
 * Cada importe se redondea a centavos. En la última cuota la amortización es todo el saldo que queda y el interés
 * y el IVA se despejan de la cuota, así que el saldo final es exactamente 0 y cada fila suma la cuota pactada.
 * Devuelve null si faltan datos para calcularlo.
 */
export function calcularPlanDePagos(datos: DatosPlan): PlanDePagos | null {
  const { montoPrestado: capital, cantidadCuotas: n, importeCuota: cuota, periodicidadPago, fechaPrimeraCuota } = datos;
  if (!(capital > 0) || !(cuota > 0) || !Number.isInteger(n) || n < 1 || n > 520 || !esFecha(fechaPrimeraCuota)) {
    return null;
  }

  const iva = COTIZADOR_CONFIG.iva;
  const conIva = tasaPorPeriodo(n, cuota, capital); // null = sin intereses
  const tasaInteres = conIva === null ? 0 : conIva / (1 + iva);

  // Cuotas mensuales: como EDATE del Excel, cada vencimiento se cuenta desde la fecha del préstamo (así el día 31
  // vuelve a ser fin de mes después de un mes corto). Se usa la fecha del contrato sólo si la primera cuota cae
  // exactamente un mes después; si no, se cuenta desde la primera cuota.
  const { fechaContrato } = datos;
  const desdeContrato =
    periodicidadPago === "mensual" &&
    !!fechaContrato &&
    esFecha(fechaContrato) &&
    sumarMeses(fechaContrato, 1) === fechaPrimeraCuota;

  const filas: FilaPlan[] = [];
  let saldo = redondear2(capital);

  for (let k = 0; k < n; k++) {
    const vence = desdeContrato
      ? sumarMeses(fechaContrato as string, k + 1)
      : periodicidadPago === "mensual"
        ? sumarMeses(fechaPrimeraCuota, k)
        : sumarDias(fechaPrimeraCuota, k * DIAS_ENTRE_CUOTAS[periodicidadPago]);
    const saldoInicial = saldo;
    let amortizacion: number;
    let interes: number;
    let ivaPesos: number;

    if (k < n - 1) {
      interes = redondear2(saldoInicial * tasaInteres);
      ivaPesos = redondear2(interes * iva);
      amortizacion = Math.min(redondear2(cuota - interes - ivaPesos), saldoInicial);
    } else {
      amortizacion = saldoInicial;
      const resto = Math.max(redondear2(cuota - amortizacion), 0);
      interes = redondear2(resto / (1 + iva));
      ivaPesos = redondear2(resto - interes);
    }

    saldo = redondear2(saldoInicial - amortizacion);
    filas.push({
      numero: k + 1,
      vence,
      saldoInicial,
      amortizacion,
      interes,
      iva: ivaPesos,
      cuota: redondear2(amortizacion + interes + ivaPesos),
      saldoFinal: saldo,
    });
  }

  const suma = (campo: "amortizacion" | "interes" | "iva" | "cuota") =>
    redondear2(filas.reduce((acc, f) => acc + f[campo], 0));
  return {
    filas,
    totales: { amortizacion: suma("amortizacion"), interes: suma("interes"), iva: suma("iva"), cuota: suma("cuota") },
  };
}
