import { z } from "zod";
import { legajoFormSchema } from "@/lib/validation/legajoSchema";
import { FILE_CATEGORIES } from "@/lib/types/legajo";
import type { LegajoFileCategoryKey, LegajoFormValues } from "@/lib/types/legajo";
import type { LegajoPdfMetadata } from "@/lib/export/legajoPdfDocument";

/**
 * Los datos del legajo viajan dentro del propio PDF (en sus metadatos), además de verse en las hojas.
 * Así la sección "Cargar legajo" puede completar el formulario a partir de un PDF.
 *
 * IMPORTANTE: es información que viene de afuera (el PDF lo generó el celular del cliente), así que al
 * leerla nunca se confía en ella: se valida campo por campo y el administrativo la revisa antes de guardar.
 */
export const PAYLOAD_PREFIX = "EZMEL-LEGAJO/1:";
const MAX_PAYLOAD_CHARS = 120_000;

export const solicitudInfoSchema = z.object({
  tipo: z.enum(["personal", "comercial"]),
  subtipo: z.enum(["blanco", "monotributo"]).optional(),
  prestamo: z.object({
    monto: z.number().positive().max(1e10),
    modalidad: z.enum(["semanal", "quincenal", "mensual"]),
    cuotas: z.number().int().min(1).max(16),
    /** Lo que decía la cotización del cliente: se informa, pero se recalcula con las condiciones oficiales. */
    valorCuota: z.number().nonnegative().max(1e11),
    total: z.number().nonnegative().max(1e11),
    /** Fecha de la cotización, "AAAA-MM-DD". */
    fecha: z.string().max(10),
  }),
  ingresosMensuales: z.string().max(60).optional(),
  redes: z.string().max(300).optional(),
  referencias: z
    .array(
      z.object({
        rol: z.string().max(60),
        nombre: z.string().max(120),
        telefono: z.string().max(40),
        detalle: z.string().max(200),
      })
    )
    .max(6),
});

export type SolicitudInfo = z.infer<typeof solicitudInfoSchema>;

export type ArchivosPorCategoria = Partial<Record<LegajoFileCategoryKey, string[]>>;

export interface LegajoPayload {
  v: 1;
  /** Quién armó el PDF: la página pública del cliente o la propia plataforma. */
  origen: "solicitud-web" | "plataforma";
  generadoEn: string;
  data: Partial<LegajoFormValues>;
  /** Leyendas de los adjuntos de cada categoría, en el orden en que están en el PDF (una imagen por hoja). */
  archivos: ArchivosPorCategoria;
  solicitud?: SolicitudInfo;
}

function aBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

function deBase64(base64: string): string {
  const binario = atob(base64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeLegajoPayload(payload: LegajoPayload): string {
  return PAYLOAD_PREFIX + aBase64(JSON.stringify(payload));
}

/** Texto de los metadatos del PDF -> objeto sin validar. Null si no es un PDF de EzMel. */
export function decodeLegajoPayload(texto: string | null | undefined): unknown {
  if (!texto || !texto.startsWith(PAYLOAD_PREFIX) || texto.length > MAX_PAYLOAD_CHARS) return null;
  try {
    return JSON.parse(deBase64(texto.slice(PAYLOAD_PREFIX.length).trim()));
  } catch {
    return null;
  }
}

/** Metadatos del PDF con los datos incrustados. */
export function buildLegajoPdfMetadata(input: {
  data: LegajoFormValues;
  files: ArchivosPorCategoria;
  origen: LegajoPayload["origen"];
  solicitud?: SolicitudInfo;
}): LegajoPdfMetadata {
  const nombre = input.data.nombreApellido || `${input.data.nombre} ${input.data.apellido}`.trim();
  const payload: LegajoPayload = {
    v: 1,
    origen: input.origen,
    generadoEn: new Date().toISOString(),
    data: input.data,
    archivos: input.files,
    solicitud: input.solicitud,
  };
  return {
    title: nombre ? `Legajo - ${nombre}` : "Legajo de cliente",
    subject: input.origen === "solicitud-web" ? "Solicitud de préstamo (EzMel)" : "Legajo de cliente (EzMel)",
    keywords: encodeLegajoPayload(payload),
  };
}

export interface PayloadLeido {
  payload: LegajoPayload;
  /** Campos del legajo que venían con un valor inválido y se descartaron. */
  descartados: string[];
}

/**
 * Valida lo que trae el PDF. Los campos del legajo se validan de a uno: uno inválido se descarta y se
 * avisa, sin perder el resto.
 */
export function parseLegajoPayload(raw: unknown): PayloadLeido | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || !r.data || typeof r.data !== "object") return null;

  const data: Record<string, unknown> = {};
  const descartados: string[] = [];
  const shape = legajoFormSchema.shape as Record<string, z.ZodType>;
  for (const [key, schema] of Object.entries(shape)) {
    const valor = (r.data as Record<string, unknown>)[key];
    // Vacío no es inválido: son los datos que completa la empresa (N.º de préstamo, fecha de apertura…).
    if (valor === undefined || valor === "") continue;
    const resultado = schema.safeParse(valor);
    if (resultado.success) data[key] = resultado.data;
    else descartados.push(key);
  }

  // PDFs generados antes de separar las referencias traían un solo texto: "Referencia personal 1: … | Referencia
  // personal 2: … | Referencia laboral: …". Se reparte en los tres campos; lo que no tenga ese formato va a la primera libre.
  const antigua = (r.data as Record<string, unknown>).referencias;
  if (
    data.referencia1 === undefined &&
    data.referencia2 === undefined &&
    data.referenciaLaboral === undefined &&
    typeof antigua === "string" &&
    antigua.trim()
  ) {
    const campos = ["referencia1", "referencia2", "referenciaLaboral"] as const;
    const asignar = (campo: (typeof campos)[number], texto: string) => {
      if (texto && data[campo] === undefined) data[campo] = texto.slice(0, 500);
    };
    for (const parte of antigua.split("|").map((t) => t.trim()).filter(Boolean)) {
      const m = /^Referencia\s+(personal\s*1|personal\s*2|laboral)\s*:\s*(.*)$/i.exec(parte);
      if (m) {
        const rol = m[1].toLowerCase().replace(/\s+/g, "");
        asignar(rol === "personal1" ? "referencia1" : rol === "personal2" ? "referencia2" : "referenciaLaboral", m[2].trim());
      } else {
        const libre = campos.find((c) => data[c] === undefined);
        if (libre) asignar(libre, parte);
      }
    }
  }

  const archivos: ArchivosPorCategoria = {};
  const crudos = (r.archivos && typeof r.archivos === "object" ? r.archivos : {}) as Record<string, unknown>;
  for (const categoria of FILE_CATEGORIES) {
    const lista = crudos[categoria.key];
    if (!Array.isArray(lista)) continue;
    archivos[categoria.key] = lista
      .filter((c): c is string => typeof c === "string")
      .slice(0, 50)
      .map((c) => c.slice(0, 200));
  }

  const solicitud = solicitudInfoSchema.safeParse(r.solicitud);

  return {
    payload: {
      v: 1,
      origen: r.origen === "solicitud-web" ? "solicitud-web" : "plataforma",
      generadoEn: typeof r.generadoEn === "string" ? r.generadoEn.slice(0, 40) : "",
      data: data as Partial<LegajoFormValues>,
      archivos,
      solicitud: solicitud.success ? solicitud.data : undefined,
    },
    descartados,
  };
}
