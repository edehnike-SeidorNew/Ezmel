import type { CausalCheques, ChequeRechazado, DeudaActual, EntidadActual, PeriodoHistorico } from "./tipos";

/**
 * Convierte las respuestas de la API del BCRA (Central de Deudores v1.0) en los tipos de la app.
 * La respuesta viene de un servicio externo: se lee de forma defensiva y lo que no cuadra se descarta.
 */

type Obj = Record<string, unknown>;

const esObjeto = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const FLAGS: [string, string][] = [
  ["refinanciaciones", "Refinanciaciones"],
  ["recategorizacionOblig", "Recategorización obligatoria"],
  ["situacionJuridica", "Situación jurídica"],
  ["irrecDisposicionTecnica", "Irrecuperable por disposición técnica"],
  ["enRevision", "En revisión"],
  ["procesoJud", "Proceso judicial"],
];

function observaciones(e: Obj): string[] {
  return FLAGS.filter(([clave]) => e[clave] === true).map(([, etiqueta]) => etiqueta);
}

export function denominacionDe(cuerpo: unknown): string | null {
  const resultados = esObjeto(cuerpo) ? cuerpo.results : null;
  return esObjeto(resultados) ? texto(resultados.denominacion) : null;
}

/** /Deudas/{cuit}: el último período informado, con una fila por entidad. */
export function normalizarActual(cuerpo: unknown): DeudaActual | null {
  const resultados = esObjeto(cuerpo) && esObjeto(cuerpo.results) ? cuerpo.results : null;
  const periodos = lista(resultados?.periodos).filter(esObjeto);
  // Se queda con el período más reciente.
  const ultimo = [...periodos].sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)))[0];
  const periodo = ultimo ? texto(ultimo.periodo) : null;
  if (!ultimo || !periodo) return null;

  const entidades: EntidadActual[] = lista(ultimo.entidades)
    .filter(esObjeto)
    .map((e) => {
      const dias = numero(e.diasAtrasoPago);
      return {
        entidad: texto(e.entidad) ?? "Entidad sin nombre",
        situacion: numero(e.situacion) ?? 0,
        monto: numero(e.monto) ?? 0,
        diasAtraso: dias && dias > 0 ? dias : null,
        fechaSit1: texto(e.fechaSit1),
        observaciones: observaciones(e),
      };
    });

  return entidades.length > 0 ? { periodo, entidades } : null;
}

/** /Deudas/Historicas/{cuit}: hasta 24 períodos, del más reciente al más antiguo. */
export function normalizarHistorica(cuerpo: unknown): PeriodoHistorico[] | null {
  const resultados = esObjeto(cuerpo) && esObjeto(cuerpo.results) ? cuerpo.results : null;
  const periodos: PeriodoHistorico[] = lista(resultados?.periodos)
    .filter(esObjeto)
    .flatMap((p) => {
      const periodo = texto(p.periodo);
      if (!periodo) return [];
      return [
        {
          periodo,
          entidades: lista(p.entidades)
            .filter(esObjeto)
            .map((e) => ({
              entidad: texto(e.entidad) ?? "Entidad sin nombre",
              situacion: numero(e.situacion) ?? 0,
              monto: numero(e.monto) ?? 0,
              observaciones: observaciones(e),
            })),
        },
      ];
    })
    .sort((a, b) => b.periodo.localeCompare(a.periodo));

  return periodos.length > 0 ? periodos : null;
}

function cheque(c: Obj): ChequeRechazado {
  return {
    numero: numero(c.nroCheque),
    fechaRechazo: texto(c.fechaRechazo),
    monto: numero(c.monto),
    fechaPago: texto(c.fechaPago),
    fechaPagoMulta: texto(c.fechaPagoMulta),
    estadoMulta: texto(c.estadoMulta),
    cuentaPersonal: typeof c.ctaPersonal === "boolean" ? c.ctaPersonal : null,
    denominacionJuridica: texto(c.denomJuridica),
    enRevision: c.enRevision === true,
    procesoJudicial: c.procesoJud === true,
  };
}

/** /Deudas/ChequesRechazados/{cuit}: agrupados por causal y entidad. */
export function normalizarCheques(cuerpo: unknown): CausalCheques[] | null {
  const resultados = esObjeto(cuerpo) && esObjeto(cuerpo.results) ? cuerpo.results : null;
  const causales: CausalCheques[] = lista(resultados?.causales)
    .filter(esObjeto)
    .map((c) => ({
      causal: texto(c.causal) ?? "Sin especificar",
      entidades: lista(c.entidades)
        .filter(esObjeto)
        .map((e) => ({
          // Según el manual: "un número de agrupamiento por banco" (no informa el nombre).
          entidad: numero(e.entidad) !== null ? `Banco N° ${numero(e.entidad)}` : (texto(e.entidad) ?? "Banco"),
          cheques: lista(e.detalle).filter(esObjeto).map(cheque),
        }))
        .filter((e) => e.cheques.length > 0),
    }))
    .filter((c) => c.entidades.length > 0);

  return causales.length > 0 ? causales : null;
}
