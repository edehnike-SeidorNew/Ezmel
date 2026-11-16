import { z } from "zod";
import { parseMontoAR } from "@/lib/format/montoAR";

const monto = z.preprocess(
  parseMontoAR,
  z.number({ error: "Ingresá un monto válido" }).positive("Debe ser mayor a 0")
);

const requerido = z.string().trim().min(1, "Requerido");

export const anulacionSchema = z.object({
  fechaConvenio: requerido,

  mutuarioNombre: requerido,
  mutuarioDni: requerido,
  mutuarioDomicilio: requerido,
  mutuarioEmail: z.string().trim().email("Email inválido"),

  fechaContratoOriginal: requerido,
  docusignId: z.string().trim(),
  montoPrestado: monto,
  montoADevolver: monto,
  cantidadCuotas: z.coerce.number().int().min(1, "Requerido"),
  fechaVencimiento: requerido,
});

export type AnulacionSchema = z.infer<typeof anulacionSchema>;
