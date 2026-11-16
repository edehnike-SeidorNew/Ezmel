/** Resultado de consultar la Central de Deudores del BCRA, ya normalizado para mostrarlo. */

export interface EntidadActual {
  entidad: string;
  /** 1 a 5 (ver SITUACIONES). */
  situacion: number;
  /** En miles de pesos. */
  monto: number;
  /** Null cuando no aplica ("N/A"). */
  diasAtraso: number | null;
  /** Desde cuándo está en situación 1, "AAAA-MM-DD". */
  fechaSit1: string | null;
  observaciones: string[];
}

export interface DeudaActual {
  /** "AAAAMM", último período informado. */
  periodo: string;
  entidades: EntidadActual[];
}

export interface EntidadHistorica {
  entidad: string;
  /** 0 = sin deuda ese mes. */
  situacion: number;
  monto: number;
  observaciones: string[];
}

export interface PeriodoHistorico {
  periodo: string;
  entidades: EntidadHistorica[];
}

export interface ChequeRechazado {
  numero: number | null;
  fechaRechazo: string | null;
  monto: number | null;
  fechaPago: string | null;
  fechaPagoMulta: string | null;
  estadoMulta: string | null;
  cuentaPersonal: boolean | null;
  denominacionJuridica: string | null;
  enRevision: boolean;
  procesoJudicial: boolean;
}

export interface CausalCheques {
  causal: string;
  entidades: { entidad: string; cheques: ChequeRechazado[] }[];
}

/** Cada consulta puede resolverse bien, no tener registros (es lo normal) o fallar por separado. */
export type Parte<T> =
  | { estado: "ok"; datos: T }
  | { estado: "sin-registros" }
  | { estado: "error"; mensaje: string };

export interface ConsultaDeudores {
  identificacion: string;
  denominacion: string | null;
  /** ISO, cuándo se hizo la consulta. */
  consultadoEn: string;
  actual: Parte<DeudaActual>;
  historica: Parte<PeriodoHistorico[]>;
  cheques: Parte<CausalCheques[]>;
}

export const SITUACIONES: Record<number, { titulo: string; detalle: string }> = {
  1: { titulo: "Normal", detalle: "Situación normal (cartera comercial) · Situación normal (consumo o vivienda)" },
  2: {
    titulo: "Seguimiento especial",
    detalle: "Con seguimiento especial (cartera comercial) · Riesgo bajo (consumo o vivienda)",
  },
  3: { titulo: "Con problemas", detalle: "Con problemas (cartera comercial) · Riesgo medio (consumo o vivienda)" },
  4: {
    titulo: "Alto riesgo de insolvencia",
    detalle: "Con alto riesgo de insolvencia (cartera comercial) · Riesgo alto (consumo o vivienda)",
  },
  5: { titulo: "Irrecuperable", detalle: "Irrecuperable (cartera comercial) · Irrecuperable (consumo o vivienda)" },
};
