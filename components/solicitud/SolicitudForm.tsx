"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cotizar } from "@/lib/cotizador/calcular";
import { MODALIDADES } from "@/lib/cotizador/config";
import { FotoNoLegibleError } from "@/lib/export/prepareUpload";
import { formatDni } from "@/lib/format/personal";
import { SUBTIPOS, faltantes, slotsPara } from "@/lib/solicitud/adjuntos";
import {
  descripcionTipo,
  solicitudSchema,
  valoresIniciales,
  type Prestamo,
  type SolicitudValores,
} from "@/lib/solicitud/formulario";
import { TIPOS, type TipoSolicitud } from "@/lib/solicitud/requisitos";
import { descargarArchivo, ResultadoSolicitud } from "./ResultadoSolicitud";
import { SlotAdjunto } from "./SlotAdjunto";

const inputClass =
  "mt-1 w-full rounded-xl border border-brand-border px-4 py-3 text-base text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#6ACEC6]/40";

const pesos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const money = (n: number) => `$ ${pesos.format(n)}`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-brand-border bg-white">
      <h3 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{titulo}</h3>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

type RefKey = "ref1" | "ref2" | "refLaboral";

/** Una referencia: nombre, apellido, teléfono y DNI (o actividad, en la referencia laboral). */
function Referencia({
  clave,
  titulo,
  laboral = false,
  register,
  errors,
}: {
  clave: RefKey;
  titulo: string;
  laboral?: boolean;
  register: ReturnType<typeof useForm<SolicitudValores>>["register"];
  errors: ReturnType<typeof useForm<SolicitudValores>>["formState"]["errors"];
}) {
  const e = errors[clave];
  return (
    <div className="rounded-xl border border-brand-border p-4">
      <h4 className="text-sm font-bold text-brand">{titulo}</h4>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={e?.nombre?.message}>
          <input className={inputClass} autoComplete="off" {...register(`${clave}.nombre`)} />
        </Field>
        <Field label="Apellido" error={e?.apellido?.message}>
          <input className={inputClass} autoComplete="off" {...register(`${clave}.apellido`)} />
        </Field>
        <Field label="Teléfono" error={e?.telefono?.message}>
          <input className={inputClass} inputMode="tel" autoComplete="off" {...register(`${clave}.telefono`)} />
        </Field>
        {laboral ? (
          <Field label="Actividad o vínculo laboral" error={e?.detalle?.message}>
            <input className={inputClass} autoComplete="off" {...register(`${clave}.detalle`)} />
          </Field>
        ) : (
          <Field label="DNI" error={e?.dni?.message}>
            <input className={inputClass} inputMode="numeric" autoComplete="off" {...register(`${clave}.dni`)} />
          </Field>
        )}
      </div>
    </div>
  );
}

/**
 * Solicitud del cliente: mismos datos que el legajo de la plataforma. Todo se arma en el dispositivo y termina en
 * un PDF que el cliente descarga y manda por WhatsApp: no hay envío a ningún servidor ni se guarda nada.
 */
export function SolicitudForm({
  tipo,
  onTipo,
  prestamo,
  hrefCotizador,
}: {
  tipo: TipoSolicitud;
  onTipo: (tipo: TipoSolicitud) => void;
  prestamo: Prestamo;
  /** Enlace para volver al cotizador y cambiar el monto o el plan. */
  hrefCotizador: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<SolicitudValores>({
    resolver: zodResolver(solicitudSchema) as Resolver<SolicitudValores>,
    defaultValues: valoresIniciales,
    mode: "onBlur",
  });

  const subtipo = useWatch({ control, name: "subtipo" });
  useEffect(() => {
    setValue("tipo", tipo);
  }, [tipo, setValue]);

  const [archivos, setArchivos] = useState<Record<string, File[]>>({});
  const [generando, setGenerando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<File | null>(null);

  const slots = useMemo(() => slotsPara(tipo, subtipo), [tipo, subtipo]);
  const pendientes = faltantes(slots, archivos);
  const cot = useMemo(
    () => cotizar(prestamo.monto, prestamo.modalidad, prestamo.cuotas, "2000-01-01"),
    [prestamo]
  );
  const unidad = MODALIDADES[prestamo.modalidad].unidad;

  const generar = handleSubmit(async (valores) => {
    if (!cot) return;
    setError(null);
    setGenerando("Preparando tu solicitud…");
    try {
      // El generador de PDF es pesado: se carga recién cuando hace falta.
      const { generarSolicitudPdf } = await import("@/lib/solicitud/generarPdf");
      const pdf = await generarSolicitudPdf({
        valores: { ...valores, tipo, subtipo },
        prestamo,
        slots,
        archivos,
        onProgreso: setGenerando,
      });
      const archivo = new File([pdf.blob], pdf.nombreArchivo, { type: "application/pdf" });
      setResultado(archivo);
      // Si el celular puede compartir el archivo directo a WhatsApp, no hace falta descargarlo (la pantalla final
      // ofrece "Enviar por WhatsApp" y, de respaldo, la descarga). Si no puede, se guarda apenas está listo.
      const puedeCompartir = typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] });
      if (!puedeCompartir) descargarArchivo(archivo);
      document.getElementById("solicitud")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.error(e);
      setError(
        e instanceof FotoNoLegibleError
          ? `${e.message} (${e.nombreArchivo})`
          : `No pudimos armar el PDF${e instanceof Error && e.message ? ` (${e.message})` : ""}. Probá de nuevo; si sigue fallando, cerrá otras aplicaciones del celular o sacá las fotos otra vez.`
      );
    } finally {
      setGenerando(null);
    }
  });

  return (
    <section aria-labelledby="solicitud-titulo" id="solicitud" className="scroll-mt-20">
      <h2 id="solicitud-titulo" className="text-2xl font-bold text-brand">
        Completá tu solicitud
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Cargá tus datos y tus documentos. Al terminar se arma un PDF en tu celular, que nos mandás por WhatsApp.
      </p>

      {resultado ? (
        <div className="mt-5">
          <ResultadoSolicitud archivo={resultado} onEditar={() => setResultado(null)} />
        </div>
      ) : (
        <form onSubmit={generar} noValidate className="mt-5 space-y-5">
          <Seccion titulo="Tu préstamo">
            {cot ? (
              <div className="space-y-1 text-sm text-slate-800">
                <p>
                  <strong className="text-lg text-brand">{money(prestamo.monto)}</strong> en{" "}
                  <strong>
                    {prestamo.cuotas} {prestamo.cuotas === 1 ? unidad[0] : unidad[1]}
                  </strong>{" "}
                  ({MODALIDADES[prestamo.modalidad].label.toLowerCase()}) de <strong>{money(cot.valorCuota)}</strong>
                </p>
                <p className="text-slate-600">Total a devolver: {money(cot.totalAPagar)}</p>
              </div>
            ) : (
              <p className="text-sm text-amber-800">Primero elegí el monto y el plan en el cotizador.</p>
            )}
            <a
              href={hrefCotizador}
              className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline-offset-2 hover:underline"
            >
              Cambiar monto o plan
            </a>
          </Seccion>

          <Seccion titulo="Tipo de solicitud">
            <div role="group" aria-label="Tipo de solicitud" className="grid grid-cols-2 gap-1 rounded-xl bg-brand-soft p-1">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === tipo}
                  onClick={() => onTipo(t.id)}
                  className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition-colors ${
                    t.id === tipo ? "bg-brand text-white shadow" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tipo === "personal" && (
              <fieldset>
                <legend className="text-sm font-semibold text-slate-900">¿Cómo trabajás?</legend>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  {SUBTIPOS.map((s) => (
                    <label
                      key={s.id}
                      className="flex flex-1 items-center gap-3 rounded-xl border border-brand-border px-4 py-3 text-sm font-medium text-slate-900 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                    >
                      <input type="radio" value={s.id} className="h-4 w-4 accent-[#1a5f6f]" {...register("subtipo")} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </Seccion>

          <Seccion titulo="Tus datos">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre" error={errors.nombre?.message}>
                <input className={inputClass} autoComplete="given-name" {...register("nombre")} />
              </Field>
              <Field label="Apellido" error={errors.apellido?.message}>
                <input className={inputClass} autoComplete="family-name" {...register("apellido")} />
              </Field>
              <Field label="DNI" error={errors.dni?.message}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  autoComplete="off"
                  {...register("dni", { onBlur: (e) => setValue("dni", formatDni(e.target.value)) })}
                />
              </Field>
              <Field label="Teléfono (con código de área)" error={errors.telefono?.message}>
                <input className={inputClass} inputMode="tel" autoComplete="tel" {...register("telefono")} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input className={inputClass} type="email" inputMode="email" autoComplete="email" {...register("email")} />
              </Field>
              <Field label="Dirección" error={errors.direccion?.message}>
                <input className={inputClass} autoComplete="street-address" {...register("direccion")} />
              </Field>
              <Field label="Código postal (opcional)" error={errors.codigoPostal?.message}>
                <input className={inputClass} inputMode="numeric" autoComplete="postal-code" {...register("codigoPostal")} />
              </Field>
            </div>
          </Seccion>

          {tipo === "comercial" && (
            <Seccion titulo="Tu negocio">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ingresos mensuales estimados ($)" error={errors.ingresosMensuales?.message}>
                  <input className={inputClass} inputMode="numeric" autoComplete="off" {...register("ingresosMensuales")} />
                </Field>
                <Field label="Redes sociales (si tiene)" error={errors.redes?.message}>
                  <input className={inputClass} autoComplete="off" placeholder="@usuario" {...register("redes")} />
                </Field>
              </div>
            </Seccion>
          )}

          <Seccion titulo="Referencias">
            <p className="text-sm text-slate-600">
              Nos comunicaremos con ellas para verificar los datos. Por favor, avisales previamente. Tienen que ser
              mayores de 18 años.
            </p>
            <Referencia clave="ref1" titulo="Referencia personal 1" register={register} errors={errors} />
            <Referencia clave="ref2" titulo="Referencia personal 2" register={register} errors={errors} />
            {tipo === "personal" && subtipo === "monotributo" && (
              <Referencia clave="refLaboral" titulo="Referencia laboral" laboral register={register} errors={errors} />
            )}
          </Seccion>

          <Seccion titulo="Documentación">
            <p className="text-sm text-slate-600">
              Sacá la foto en el momento o elegila de tu galería. Sin estos documentos no podemos continuar con la
              evaluación.
            </p>
            {slots.map((slot) => (
              <SlotAdjunto
                key={slot.key}
                slot={slot}
                archivos={archivos[slot.key] ?? []}
                onChange={(lista) => setArchivos((prev) => ({ ...prev, [slot.key]: lista }))}
              />
            ))}
          </Seccion>

          {pendientes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Para generar tu solicitud todavía falta:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {pendientes.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pendientes.length > 0 || !cot || generando !== null}
            className="w-full rounded-xl bg-brand px-5 py-4 text-base font-semibold text-white shadow-md hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generando ?? "Generar mi solicitud (PDF)"}
          </button>
          <p className="text-center text-xs text-slate-500">
            {descripcionTipo(tipo, subtipo)}. El PDF se arma en tu dispositivo: no guardamos tus datos ni tus fotos en
            esta página.
          </p>
        </form>
      )}
    </section>
  );
}
