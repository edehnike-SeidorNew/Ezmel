/** Datos del contrato de refinanciación de deuda. Las fechas van como "AAAA-MM-DD" y los montos en pesos. */
export interface RefinanciacionDatos {
  /** Fecha del contrato (encabezado). */
  fechaContrato: string;

  // Deudor
  deudorNombre: string;
  /** DNI o CUIT. */
  deudorDocumento: string;
  deudorDomicilio: string;
  /** Domicilio electrónico (email). */
  deudorEmail: string;

  // Antecedentes
  origenDeuda: string;
  instrumentoDeuda: string;
  fechaDeuda: string;
  /** Capital adeudado. */
  montoDeuda: number;
  /** Desde cuándo la obligación está vencida y es exigible. */
  fechaVencimientoDeuda: string;

  // Quita (opcional)
  conQuita: boolean;
  montoQuita: number;

  montoRefinanciado: number;

  // Plan de pagos
  /** 0 = sin anticipo. */
  anticipo: number;
  cantidadCuotas: number;
  importeCuota: number;
  fechaPrimeraCuota: string;

  // Intereses de financiación
  tna: number;
  tea: number;

  /** Incluye la cláusula de información al consumidor. */
  esConsumidor: boolean;
  medioPago: string;
  /** Punitorio: porcentaje del interés pactado. */
  punitorioPorcentaje: number;

  // Pagaré en garantía (opcional)
  conPagare: boolean;
  montoPagare: number;
  fechaVencimientoPagare: string;

  // Garantía personal (opcional)
  conGarante: boolean;
  garanteNombre: string;
  garanteDocumento: string;
  garanteDomicilio: string;

  gastosACargoDe: string;
  /** Tribunales ordinarios de... */
  competencia: string;
}
