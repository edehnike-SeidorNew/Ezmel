import { z } from "zod";
import { parseMontoAR } from "@/lib/format/montoAR";

const monto = z.preprocess(
  parseMontoAR,
  z.number({ error: "Ingresá un monto válido" }).positive("Debe ser mayor a 0")
);

/** Monto que puede dejarse vacío (= 0). */
const montoOpcional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : parseMontoAR(v)),
  z.number({ error: "Ingresá un monto válido" }).min(0, "No puede ser negativo")
);

/** Porcentaje en formato argentino (437,19 · 4.059,16). */
const porcentaje = z.preprocess(
  parseMontoAR,
  z.number({ error: "Ingresá un porcentaje válido" }).positive("Debe ser mayor a 0")
);

const requerido = z.string().trim().min(1, "Requerido");
const texto = z.string().trim();

export const refinanciacionSchema = z
  .object({
    fechaContrato: requerido,

    deudorNombre: requerido,
    deudorDocumento: requerido,
    deudorDomicilio: requerido,
    deudorEmail: z.string().trim().email("Email inválido"),

    origenDeuda: requerido,
    instrumentoDeuda: requerido,
    fechaDeuda: requerido,
    montoDeuda: monto,
    fechaVencimientoDeuda: requerido,

    conQuita: z.boolean(),
    montoQuita: montoOpcional,

    montoRefinanciado: monto,

    anticipo: montoOpcional,
    cantidadCuotas: z.coerce.number().int().min(1, "Requerido"),
    importeCuota: monto,
    fechaPrimeraCuota: requerido,

    tna: porcentaje,
    tea: porcentaje,

    esConsumidor: z.boolean(),
    medioPago: requerido,
    punitorioPorcentaje: porcentaje,

    conPagare: z.boolean(),
    montoPagare: montoOpcional,
    fechaVencimientoPagare: texto,

    conGarante: z.boolean(),
    garanteNombre: texto,
    garanteDocumento: texto,
    garanteDomicilio: texto,

    gastosACargoDe: requerido,
    competencia: requerido,
  })
  .superRefine((d, ctx) => {
    const falta = (path: keyof typeof d, message = "Requerido") => ctx.addIssue({ code: "custom", path: [path], message });

    if (d.conQuita) {
      if (!(d.montoQuita > 0)) falta("montoQuita", "Ingresá el monto de la quita");
      else if (d.montoQuita >= d.montoDeuda) falta("montoQuita", "La quita tiene que ser menor que la deuda");
    }
    if (d.conPagare) {
      if (!(d.montoPagare > 0)) falta("montoPagare", "Ingresá el monto del pagaré");
      if (!d.fechaVencimientoPagare) falta("fechaVencimientoPagare");
    }
    if (d.conGarante) {
      if (!d.garanteNombre) falta("garanteNombre");
      if (!d.garanteDocumento) falta("garanteDocumento");
      if (!d.garanteDomicilio) falta("garanteDomicilio");
    }
  });

export type RefinanciacionSchema = z.infer<typeof refinanciacionSchema>;
