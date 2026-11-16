import type { LegajoFileCategoryKey } from "@/lib/types/legajo";
import type { TipoSolicitud } from "./requisitos";

export type Subtipo = "blanco" | "monotributo";

export const SUBTIPOS: { id: Subtipo; label: string }[] = [
  { id: "blanco", label: "Trabajador en blanco" },
  { id: "monotributo", label: "Monotributista" },
];

/** Un documento que el cliente tiene que adjuntar. */
export interface SlotAdjunto {
  key: string;
  label: string;
  ayuda?: string;
  /** En qué categoría del legajo se guarda (la leyenda de cada imagen dice de qué documento es). */
  categoria: LegajoFileCategoryKey;
  /** Cuántos archivos hacen falta como mínimo y cuántos se aceptan como máximo. */
  min: number;
  max: number;
  /** Cámara que se abre al sacar la foto: la trasera (documentos) o la frontal (selfie). */
  camara: "environment" | "user";
  /** Solo fotos (no PDF). */
  soloImagen: boolean;
}

const doc = (s: Omit<SlotAdjunto, "camara" | "soloImagen"> & Partial<Pick<SlotAdjunto, "camara" | "soloImagen">>): SlotAdjunto => ({
  camara: "environment",
  soloImagen: false,
  ...s,
});

const DNI_FRENTE = doc({
  key: "dniFrente",
  label: "DNI – frente",
  ayuda: "Foto del frente, bien iluminada y sin reflejos.",
  categoria: "dni",
  min: 1,
  max: 1,
  soloImagen: true,
});
const DNI_DORSO = doc({
  key: "dniDorso",
  label: "DNI – dorso",
  ayuda: "Foto del dorso, bien iluminada y sin reflejos.",
  categoria: "dni",
  min: 1,
  max: 1,
  soloImagen: true,
});
const SELFIE = doc({
  key: "selfieDni",
  label: "Selfie con el DNI en la mano",
  ayuda: "Tu cara y el DNI en la misma foto, bien visibles.",
  categoria: "dni",
  min: 1,
  max: 1,
  camara: "user",
  soloImagen: true,
});
const DOMICILIO = doc({
  key: "domicilio",
  label: "Comprobante de domicilio",
  ayuda: "Factura de luz, agua, gas u otro servicio.",
  categoria: "servicios",
  min: 1,
  max: 3,
});

/** Documentos obligatorios según el tipo de solicitud. Salen de los requisitos que se muestran en la página. */
export function slotsPara(tipo: TipoSolicitud, subtipo: Subtipo): SlotAdjunto[] {
  if (tipo === "comercial") {
    return [
      DNI_FRENTE,
      DNI_DORSO,
      SELFIE,
      DOMICILIO,
      doc({
        key: "frenteNegocio",
        label: "Foto del frente del negocio",
        categoria: "capturasVarias",
        min: 1,
        max: 2,
        soloImagen: true,
      }),
      doc({
        key: "stockNegocio",
        label: "Foto del stock",
        categoria: "capturasVarias",
        min: 1,
        max: 4,
        soloImagen: true,
      }),
      doc({ key: "constanciaArca", label: "Constancia de ARCA", categoria: "capturasVarias", min: 1, max: 2 }),
      doc({ key: "pagosMono", label: "Pagos del monotributo", categoria: "capturasVarias", min: 1, max: 6 }),
      doc({
        key: "facturas",
        label: "Facturas de los últimos 3 meses",
        categoria: "capturasVarias",
        min: 1,
        max: 12,
      }),
      doc({
        key: "extractos",
        label: "Extractos bancarios o de billeteras virtuales",
        ayuda: "De los últimos 3 meses.",
        categoria: "capturasVarias",
        min: 1,
        max: 6,
      }),
    ];
  }

  if (subtipo === "monotributo") {
    return [
      doc({
        key: "constanciaMono",
        label: "Constancia de inscripción al Monotributo",
        ayuda: "Actualizada.",
        categoria: "capturasVarias",
        min: 1,
        max: 2,
      }),
      doc({
        key: "pagosMono",
        label: "Últimos 3 comprobantes de pago del Monotributo",
        ayuda: "Un comprobante por mes.",
        categoria: "capturasVarias",
        min: 3,
        max: 6,
      }),
      doc({
        key: "movimientos",
        label: "Movimientos bancarios o de billetera virtual",
        ayuda: "De los últimos 3 meses.",
        categoria: "capturasVarias",
        min: 1,
        max: 6,
      }),
      DNI_FRENTE,
      DNI_DORSO,
      SELFIE,
      DOMICILIO,
    ];
  }

  return [
    doc({
      key: "recibos",
      label: "Últimos 3 recibos de sueldo",
      ayuda: "Un recibo por mes (foto o PDF).",
      categoria: "haberes",
      min: 3,
      max: 6,
    }),
    DNI_FRENTE,
    DNI_DORSO,
    SELFIE,
    DOMICILIO,
  ];
}

/** Lo que falta adjuntar, listo para mostrar: "Recibos: faltan 2". */
export function faltantes(slots: SlotAdjunto[], archivos: Record<string, unknown[] | undefined>): string[] {
  const out: string[] = [];
  for (const slot of slots) {
    const cantidad = archivos[slot.key]?.length ?? 0;
    if (cantidad >= slot.min) continue;
    out.push(slot.min === 1 ? slot.label : `${slot.label} (faltan ${slot.min - cantidad})`);
  }
  return out;
}

/** Máximo de peso por archivo antes de achicarlo (las fotos de celular pesan varios MB). */
export const MAX_BYTES_ARCHIVO = 30 * 1024 * 1024;
