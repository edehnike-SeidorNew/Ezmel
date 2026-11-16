"use client";

import { useFormContext } from "react-hook-form";
import { DateField } from "@/components/ui/DateField";
import { formatDni, formatDomicilio } from "@/lib/format/personal";
import type { AnulacionSchema } from "@/lib/validation/anulacionSchema";

const inputClass =
  "mt-1 w-full rounded-md border border-brand-border px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none";

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

export function StepFormularioAnulacion() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<AnulacionSchema>();

  return (
    <div className="space-y-5">
      <Section title="Datos del mutuario">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" error={errors.mutuarioNombre?.message}>
            <input className={inputClass} {...register("mutuarioNombre")} />
          </Field>
          <Field label="DNI" error={errors.mutuarioDni?.message}>
            <input
              inputMode="numeric"
              className={inputClass}
              {...register("mutuarioDni", { onBlur: (e) => setValue("mutuarioDni", formatDni(e.target.value)) })}
            />
          </Field>
          <Field label="Domicilio" error={errors.mutuarioDomicilio?.message}>
            <input
              className={inputClass}
              {...register("mutuarioDomicilio", { onBlur: (e) => setValue("mutuarioDomicilio", formatDomicilio(e.target.value)) })}
            />
          </Field>
          <Field label="Email" error={errors.mutuarioEmail?.message}>
            <input type="email" className={inputClass} {...register("mutuarioEmail")} />
          </Field>
        </div>
      </Section>

      <Section title="Contrato de mutuo que se anula">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha del contrato" error={errors.fechaContratoOriginal?.message}>
            <DateField name="fechaContratoOriginal" className={inputClass} />
          </Field>
          <Field label="ID del sobre de firma (Docusign, opcional)" error={errors.docusignId?.message}>
            <input className={inputClass} placeholder="454B6237-DB61-8BFC-81E4-0AE54B758AB6" {...register("docusignId")} />
          </Field>
          <Field label="Importe prestado ($)" error={errors.montoPrestado?.message}>
            <input type="text" inputMode="decimal" placeholder="0" className={inputClass} {...register("montoPrestado")} />
          </Field>
          <Field label="Suma total a devolver ($)" error={errors.montoADevolver?.message}>
            <input type="text" inputMode="decimal" placeholder="0" className={inputClass} {...register("montoADevolver")} />
          </Field>
          <Field label="Cantidad de cuotas" error={errors.cantidadCuotas?.message}>
            <input type="number" step="1" min="1" className={inputClass} {...register("cantidadCuotas")} />
          </Field>
          <Field label="Vencimiento (de la última cuota y del pagaré)" error={errors.fechaVencimiento?.message}>
            <DateField name="fechaVencimiento" className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="Convenio de anulación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha del convenio" error={errors.fechaConvenio?.message}>
            <DateField name="fechaConvenio" className={inputClass} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          El mutuante (DELTA ACTIVOS S.A.S.) y su administrador son fijos. El convenio declara que el dinero nunca fue entregado.
        </p>
      </Section>
    </div>
  );
}
