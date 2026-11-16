import { planValido } from "@/lib/cotizador/calcular";
import { MODALIDADES, type Modalidad } from "@/lib/cotizador/config";
import type { Prestamo } from "./formulario";
import type { TipoSolicitud } from "./requisitos";

/** Plan con el que arranca el cotizador. */
export const PRESTAMO_INICIAL: Prestamo = { monto: 300000, modalidad: "mensual", cuotas: 3 };

type Params = Record<string, string | string[] | undefined>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * El tipo y el plan cotizado viajan en la URL entre el cotizador y el formulario (no llevan datos
 * personales). Vienen de afuera, así que se validan: si el plan no es válido, `prestamo` es null.
 */
export function leerParametros(params: Params): { tipo: TipoSolicitud; prestamo: Prestamo | null } {
  const tipo: TipoSolicitud = uno(params.tipo) === "comercial" ? "comercial" : "personal";

  const monto = Number((uno(params.monto) ?? "").replace(/\D/g, "").slice(0, 9));
  const modalidad = uno(params.modalidad) as Modalidad;
  const cuotas = Number(uno(params.cuotas));

  const valido = modalidad in MODALIDADES && planValido(monto, modalidad, cuotas);
  return { tipo, prestamo: valido ? { monto, modalidad, cuotas } : null };
}

/** Query string para pasar el tipo y el plan a la otra página. */
export function aQuery(tipo: TipoSolicitud, prestamo: Prestamo): string {
  return new URLSearchParams({
    tipo,
    monto: String(prestamo.monto),
    modalidad: prestamo.modalidad,
    cuotas: String(prestamo.cuotas),
  }).toString();
}
