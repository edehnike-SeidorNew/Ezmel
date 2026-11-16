"use client";

import { useState } from "react";
import { FormProvider, useForm, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StepRevisionDocumento } from "@/components/documento/StepRevisionDocumento";
import { StepIndicator } from "@/components/legajo/StepIndicator";
import { buildRefinanciacionContenido } from "@/lib/refinanciacion/contenido";
import { refinanciacionSchema, type RefinanciacionSchema } from "@/lib/validation/refinanciacionSchema";
import { StepFormularioRefinanciacion } from "./StepFormularioRefinanciacion";

const STEPS = ["Datos de la refinanciación", "Contrato final"];

// Los montos arrancan vacíos (se muestran con placeholder) para poder escribir sin borrar un "0".
const defaultValues: DefaultValues<RefinanciacionSchema> = {
  fechaContrato: "",
  deudorNombre: "",
  deudorDocumento: "",
  deudorDomicilio: "",
  deudorEmail: "",
  origenDeuda: "",
  instrumentoDeuda: "",
  fechaDeuda: "",
  fechaVencimientoDeuda: "",
  conQuita: false,
  cantidadCuotas: 1,
  fechaPrimeraCuota: "",
  esConsumidor: true,
  medioPago: "",
  conPagare: true,
  fechaVencimientoPagare: "",
  conGarante: false,
  garanteNombre: "",
  garanteDocumento: "",
  garanteDomicilio: "",
  gastosACargoDe: "",
  competencia: "",
};

export function RefinanciacionWizard() {
  const [step, setStep] = useState(0);
  const [datos, setDatos] = useState<RefinanciacionSchema | null>(null);

  const methods = useForm<RefinanciacionSchema>({
    resolver: zodResolver(refinanciacionSchema) as Resolver<RefinanciacionSchema>,
    defaultValues,
    mode: "onBlur",
  });

  async function goNext() {
    const valid = await methods.trigger();
    if (!valid) return;
    const parsed = refinanciacionSchema.safeParse(methods.getValues());
    if (!parsed.success) return;
    setDatos(parsed.data);
    setStep(1);
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <StepIndicator steps={STEPS} current={step} />

        {step === 0 && <StepFormularioRefinanciacion />}
        {step === 1 && datos && (
          <StepRevisionDocumento
            contenido={buildRefinanciacionContenido(datos)}
            endpoint="/api/refinanciacion/export"
            datos={datos}
            archivoPorDefecto="Refinanciacion"
          />
        )}

        <div className="flex justify-between border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setStep(0)}
            disabled={step === 0}
            className="min-h-11 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-40"
          >
            Atrás
          </button>
          {step === 0 && (
            <button
              type="button"
              onClick={goNext}
              className="min-h-11 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
