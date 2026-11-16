"use client";

import { useFormContext } from "react-hook-form";
import { DateField } from "@/components/ui/DateField";
import { sumarMeses } from "@/lib/cotizador/calcular";
import { formatFechaCorta } from "@/lib/format/dateEs";
import { parseMontoAR } from "@/lib/format/montoAR";
import { formatDni, formatDomicilio } from "@/lib/format/personal";
import type { RefinanciacionSchema } from "@/lib/validation/refinanciacionSchema";

const inputClass =
  "mt-1 w-full rounded-md border border-brand-border px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none";
const readOnlyInputClass = "mt-1 w-full rounded-md border border-brand-border bg-slate-100 px-3 py-2 text-sm text-slate-500";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-brand-border bg-white">
      <h3 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Casilla para activar una cláusula opcional. */
function Casilla({ children, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
      <input type="checkbox" className="h-4 w-4 rounded border-brand-border accent-[#1a5f6f]" {...props} />
      {children}
    </label>
  );
}

const pesos = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function StepFormularioRefinanciacion() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RefinanciacionSchema>();

  const conQuita = watch("conQuita");
  const conPagare = watch("conPagare");
  const conGarante = watch("conGarante");

  const deuda = parseMontoAR(watch("montoDeuda"));
  const quita = parseMontoAR(watch("montoQuita"));
  const porcentajeQuita = conQuita && deuda && quita ? (quita / deuda) * 100 : null;

  const cuotas = Number(watch("cantidadCuotas")) || 0;
  const primera = watch("fechaPrimeraCuota");
  const cancelacion = primera && cuotas > 0 ? formatFechaCorta(sumarMeses(primera, cuotas - 1)) : "";

  const monto = (name: keyof RefinanciacionSchema, placeholder = "0") => (
    <input type="text" inputMode="decimal" placeholder={placeholder} className={inputClass} {...register(name)} />
  );

  return (
    <div className="space-y-5">
      <Section title="Fecha del contrato">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha" error={errors.fechaContrato?.message}>
            <DateField name="fechaContrato" className={inputClass} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          El acreedor (Ezequiel Matias Alberti) y el lugar (Libertad, Merlo) son fijos.
        </p>
      </Section>

      <Section title="Datos del deudor">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" error={errors.deudorNombre?.message}>
            <input className={inputClass} {...register("deudorNombre")} />
          </Field>
          <Field label="DNI / CUIT" error={errors.deudorDocumento?.message}>
            <input
              inputMode="numeric"
              className={inputClass}
              {...register("deudorDocumento", { onBlur: (e) => setValue("deudorDocumento", formatDni(e.target.value)) })}
            />
          </Field>
          <Field label="Domicilio real" error={errors.deudorDomicilio?.message}>
            <input
              className={inputClass}
              {...register("deudorDomicilio", { onBlur: (e) => setValue("deudorDomicilio", formatDomicilio(e.target.value)) })}
            />
          </Field>
          <Field label="Domicilio electrónico (email)" error={errors.deudorEmail?.message}>
            <input type="email" className={inputClass} {...register("deudorEmail")} />
          </Field>
        </div>
      </Section>

      <Section title="Antecedentes de la deuda">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Origen de la deuda" error={errors.origenDeuda?.message}>
            <input className={inputClass} placeholder="un contrato de mutuo" {...register("origenDeuda")} />
          </Field>
          <Field label="Instrumentada en" error={errors.instrumentoDeuda?.message}>
            <input className={inputClass} placeholder="un contrato de mutuo y un pagaré" {...register("instrumentoDeuda")} />
          </Field>
          <Field label="Fecha de la deuda" error={errors.fechaDeuda?.message}>
            <DateField name="fechaDeuda" className={inputClass} />
          </Field>
          <Field label="Capital adeudado ($)" error={errors.montoDeuda?.message}>
            {monto("montoDeuda")}
          </Field>
          <Field label="Vencida y exigible desde" error={errors.fechaVencimientoDeuda?.message}>
            <DateField name="fechaVencimientoDeuda" className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="Quita y monto refinanciado">
        <div className="space-y-4">
          <Casilla {...register("conQuita")}>Se otorga una quita</Casilla>
          {conQuita && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Monto de la quita ($)" error={errors.montoQuita?.message}>
                {monto("montoQuita")}
              </Field>
              <Field label="Porcentaje de la deuda (%)">
                <input
                  readOnly
                  tabIndex={-1}
                  className={readOnlyInputClass}
                  value={porcentajeQuita !== null ? pesos.format(porcentajeQuita) : ""}
                />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto total refinanciado ($)" error={errors.montoRefinanciado?.message}>
              {monto("montoRefinanciado")}
            </Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          El monto refinanciado comprende capital, intereses devengados y gastos, menos la quita si corresponde.
        </p>
      </Section>

      <Section title="Plan de pagos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Anticipo en este acto ($, opcional)" error={errors.anticipo?.message}>
            {monto("anticipo", "Sin anticipo")}
          </Field>
          <Field label="Cantidad de cuotas mensuales" error={errors.cantidadCuotas?.message}>
            <input type="number" step="1" min="1" className={inputClass} {...register("cantidadCuotas")} />
          </Field>
          <Field label="Importe por cuota ($)" error={errors.importeCuota?.message}>
            {monto("importeCuota")}
          </Field>
          <Field label="Vencimiento de la primera cuota" error={errors.fechaPrimeraCuota?.message}>
            <DateField name="fechaPrimeraCuota" className={inputClass} />
          </Field>
          <Field label="Cancelación total (se calcula sola)">
            <input readOnly tabIndex={-1} className={readOnlyInputClass} value={cancelacion} />
          </Field>
          <Field label="TNA – Tasa Nominal Anual (%)" error={errors.tna?.message}>
            {monto("tna", "0,00")}
          </Field>
          <Field label="TEA – Tasa Efectiva Anual (%)" error={errors.tea?.message}>
            {monto("tea", "0,00")}
          </Field>
        </div>
      </Section>

      <Section title="Condiciones">
        <div className="space-y-4">
          <Casilla {...register("esConsumidor")}>El deudor es consumidor (incluye la cláusula de información)</Casilla>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Medio de pago" error={errors.medioPago?.message}>
              <input className={inputClass} placeholder="transferencia bancaria a la cuenta del acreedor" {...register("medioPago")} />
            </Field>
            <Field label="Interés punitorio (% del interés pactado)" error={errors.punitorioPorcentaje?.message}>
              {monto("punitorioPorcentaje", "50")}
            </Field>
            <Field label="Gastos, sellados e impuestos a cargo de" error={errors.gastosACargoDe?.message}>
              <input className={inputClass} placeholder="EL DEUDOR" {...register("gastosACargoDe")} />
            </Field>
            <Field label="Tribunales ordinarios de" error={errors.competencia?.message}>
              <input className={inputClass} placeholder="Morón" {...register("competencia")} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Pagaré en garantía">
        <div className="space-y-4">
          <Casilla {...register("conPagare")}>El deudor firma un pagaré en garantía</Casilla>
          {conPagare && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Monto del pagaré ($)" error={errors.montoPagare?.message}>
                {monto("montoPagare")}
              </Field>
              <Field label="Vencimiento del pagaré" error={errors.fechaVencimientoPagare?.message}>
                <DateField name="fechaVencimientoPagare" className={inputClass} />
              </Field>
            </div>
          )}
        </div>
      </Section>

      <Section title="Garantía personal (fiador)">
        <div className="space-y-4">
          <Casilla {...register("conGarante")}>Interviene un fiador</Casilla>
          {conGarante && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" error={errors.garanteNombre?.message}>
                <input className={inputClass} {...register("garanteNombre")} />
              </Field>
              <Field label="DNI" error={errors.garanteDocumento?.message}>
                <input
                  inputMode="numeric"
                  className={inputClass}
                  {...register("garanteDocumento", { onBlur: (e) => setValue("garanteDocumento", formatDni(e.target.value)) })}
                />
              </Field>
              <Field label="Domicilio" error={errors.garanteDomicilio?.message}>
                <input
                  className={inputClass}
                  {...register("garanteDomicilio", { onBlur: (e) => setValue("garanteDomicilio", formatDomicilio(e.target.value)) })}
                />
              </Field>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
