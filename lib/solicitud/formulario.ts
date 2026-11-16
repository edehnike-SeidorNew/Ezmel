import { z } from "zod";
import { cotizar } from "@/lib/cotizador/calcular";
import { MODALIDADES, type Modalidad } from "@/lib/cotizador/config";
import { formatDni, formatDomicilio } from "@/lib/format/personal";
import { parseMontoAR } from "@/lib/format/montoAR";
import type { SolicitudInfo } from "@/lib/legajo/payload";
import { SERVICIOS_DEFAULT, type LegajoFormValues } from "@/lib/types/legajo";
import type { TipoSolicitud } from "./requisitos";
import { SUBTIPOS, type Subtipo } from "./adjuntos";

export interface Prestamo {
  monto: number;
  modalidad: Modalidad;
  cuotas: number;
}

const soloDigitos = (v: string) => v.replace(/\D/g, "");

const persona = z.object({
  nombre: z.string().trim().max(60),
  apellido: z.string().trim().max(60),
  telefono: z.string().trim().max(30),
  dni: z.string().trim().max(15),
  /** En la referencia laboral: la actividad o vínculo laboral. */
  detalle: z.string().trim().max(120),
});

export type Persona = z.infer<typeof persona>;

export const solicitudSchema = z
  .object({
    tipo: z.enum(["personal", "comercial"]),
    subtipo: z.enum(["blanco", "monotributo"]),

    nombre: z.string().trim().min(1, "Ingresá tu nombre").max(60),
    apellido: z.string().trim().min(1, "Ingresá tu apellido").max(60),
    dni: z
      .string()
      .trim()
      .refine((v) => {
        const n = soloDigitos(v).length;
        return n >= 7 && n <= 9;
      }, "Ingresá un DNI válido"),
    telefono: z
      .string()
      .trim()
      .refine((v) => soloDigitos(v).length >= 8, "Ingresá un teléfono válido, con código de área"),
    email: z.string().trim().email("Ingresá un email válido").max(120),
    direccion: z.string().trim().min(3, "Ingresá tu dirección").max(160),
    codigoPostal: z.string().trim().max(10),

    ingresosMensuales: z.string().trim().max(30),
    redes: z.string().trim().max(200),

    ref1: persona,
    ref2: persona,
    refLaboral: persona,
  })
  .superRefine((d, ctx) => {
    const exigir = (ref: "ref1" | "ref2" | "refLaboral", campos: (keyof Persona)[]) => {
      for (const campo of campos) {
        const valor = d[ref][campo];
        const vacio = !valor;
        const invalido =
          (campo === "telefono" && !vacio && soloDigitos(valor).length < 8) ||
          (campo === "dni" && !vacio && (soloDigitos(valor).length < 7 || soloDigitos(valor).length > 9));
        if (vacio || invalido) {
          ctx.addIssue({
            code: "custom",
            path: [ref, campo],
            message: vacio ? "Requerido" : campo === "telefono" ? "Teléfono inválido" : "DNI inválido",
          });
        }
      }
    };

    exigir("ref1", ["nombre", "apellido", "telefono", "dni"]);
    exigir("ref2", ["nombre", "apellido", "telefono", "dni"]);
    if (d.tipo === "personal" && d.subtipo === "monotributo") {
      exigir("refLaboral", ["nombre", "apellido", "telefono", "detalle"]);
    }
    if (d.tipo === "comercial") {
      const ingresos = parseMontoAR(d.ingresosMensuales);
      if (!ingresos || ingresos <= 0) {
        ctx.addIssue({ code: "custom", path: ["ingresosMensuales"], message: "Ingresá tus ingresos mensuales estimados" });
      }
    }
  });

export type SolicitudValores = z.infer<typeof solicitudSchema>;

const personaVacia: Persona = { nombre: "", apellido: "", telefono: "", dni: "", detalle: "" };

export const valoresIniciales: SolicitudValores = {
  tipo: "personal",
  subtipo: "blanco",
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  direccion: "",
  codigoPostal: "",
  ingresosMensuales: "",
  redes: "",
  ref1: { ...personaVacia },
  ref2: { ...personaVacia },
  refLaboral: { ...personaVacia },
};

const money = (n: number) => `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n)}`;
const nombreCompleto = (p: Persona) => `${p.nombre} ${p.apellido}`.trim();

/** Fecha local de hoy, "AAAA-MM-DD". */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Nombre del tipo de solicitud tal como se muestra: "Personal – Trabajador en blanco". */
export function descripcionTipo(tipo: TipoSolicitud, subtipo: Subtipo): string {
  if (tipo === "comercial") return "Comercial";
  return `Personal – ${SUBTIPOS.find((s) => s.id === subtipo)?.label ?? ""}`;
}

/**
 * Convierte lo que cargó el cliente en un legajo: los mismos campos que el formulario de legajo de la
 * plataforma. Lo que corresponde a la empresa (N.º de préstamo, fecha de apertura, checklist y responsable)
 * queda vacío para que lo complete el administrativo.
 */
/** "María Pérez · Tel. 11 2345 6789 · DNI 30.111.222" (vacío si no hay referencia). */
function textoReferencia(r: SolicitudInfo["referencias"][number] | undefined): string {
  return r ? `${r.nombre} · Tel. ${r.telefono} · ${r.detalle}` : "";
}

export function armarLegajo(v: SolicitudValores, prestamo: Prestamo, hoy: string): {
  legajo: LegajoFormValues;
  solicitud: SolicitudInfo;
} {
  const cot = cotizar(prestamo.monto, prestamo.modalidad, prestamo.cuotas, hoy);
  const plural = MODALIDADES[prestamo.modalidad];
  const planTexto = cot
    ? `${money(prestamo.monto)} en ${prestamo.cuotas} ${prestamo.cuotas === 1 ? plural.unidad[0] : plural.unidad[1]} ` +
      `(${plural.label.toLowerCase()}) de ${money(cot.valorCuota)}; total a devolver ${money(cot.totalAPagar)}`
    : money(prestamo.monto);

  const referencias: SolicitudInfo["referencias"] = [
    { rol: "Referencia personal 1", nombre: nombreCompleto(v.ref1), telefono: v.ref1.telefono, detalle: `DNI ${v.ref1.dni}` },
    { rol: "Referencia personal 2", nombre: nombreCompleto(v.ref2), telefono: v.ref2.telefono, detalle: `DNI ${v.ref2.dni}` },
  ];
  if (v.tipo === "personal" && v.subtipo === "monotributo") {
    referencias.push({
      rol: "Referencia laboral",
      nombre: nombreCompleto(v.refLaboral),
      telefono: v.refLaboral.telefono,
      detalle: v.refLaboral.detalle,
    });
  }

  const observaciones = [
    "Solicitud enviada por el cliente: pendiente de validación.",
    `Tipo: ${descripcionTipo(v.tipo, v.subtipo)}`,
    `Préstamo solicitado: ${planTexto}`,
    ...(v.tipo === "comercial"
      ? [`Ingresos mensuales estimados: ${v.ingresosMensuales}`, ...(v.redes ? [`Redes sociales: ${v.redes}`] : [])]
      : []),
  ].join("\n");

  const legajo: LegajoFormValues = {
    nombreApellido: `${v.nombre} ${v.apellido}`.trim(),
    numeroPrestamo: "",
    dni: formatDni(v.dni),
    fechaApertura: "",
    nombre: v.nombre,
    apellido: v.apellido,
    telefono: v.telefono,
    email: v.email,
    direccion: formatDomicilio(v.direccion),
    codigoPostal: v.codigoPostal,
    // Cada referencia va en su propio campo del legajo (la laboral sólo existe para monotributistas).
    referencia1: textoReferencia(referencias[0]),
    referencia2: textoReferencia(referencias[1]),
    referenciaLaboral: textoReferencia(referencias[2]),
    montoPrestamo: prestamo.monto,
    servicios: SERVICIOS_DEFAULT.map((servicio) => ({ servicio, titular: "", fecha: "", observaciones: "" })),
    observacionesGenerales: observaciones,
    checklist: {
      documentacionCompleta: false,
      dniVerificado: false,
      haberesVerificados: false,
      serviciosVerificados: false,
      capturasIncorporadas: false,
      legajoCompleto: false,
    },
    responsable: "",
    fechaResponsable: "",
    dniObs: "",
    haberesObs: "",
    serviciosObs: "",
    transferenciasObs: "",
    capturasVariasObs: "",
  };

  const solicitud: SolicitudInfo = {
    tipo: v.tipo,
    subtipo: v.tipo === "personal" ? v.subtipo : undefined,
    prestamo: {
      ...prestamo,
      valorCuota: cot?.valorCuota ?? 0,
      total: cot?.totalAPagar ?? 0,
      fecha: hoy,
    },
    ingresosMensuales: v.tipo === "comercial" ? v.ingresosMensuales : undefined,
    redes: v.tipo === "comercial" && v.redes ? v.redes : undefined,
    referencias,
  };

  return { legajo, solicitud };
}
