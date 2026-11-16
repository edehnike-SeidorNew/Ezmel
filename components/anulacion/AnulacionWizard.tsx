"use client";

import { useState } from "react";
import { FormProvider, useForm, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StepRevisionDocumento } from "@/components/documento/StepRevisionDocumento";
import { StepIndicator } from "@/components/legajo/StepIndicator";
import { buildAnulacionContenido } from "@/lib/anulacion/contenido";
import { anulacionSchema, type AnulacionSchema } from "@/lib/validation/anulacionSchema";
import { StepFormularioAnulacion } from "./StepFormularioAnulacion";

const STEPS = ["Datos de la anulación", "Convenio final"];

// Los montos arrancan vacíos (se muestran con placeholder) para poder escribir sin borrar un "0".
const defaultValues: DefaultValues<AnulacionSchema> = {
  fechaConvenio: "",
  mutuarioNombre: "",
  mutuarioDni: "",
  mutuarioDomicilio: "",
  mutuarioEmail: "",
  fechaContratoOriginal: "",
  docusignId: "",
  cantidadCuotas: 1,
  fechaVencimiento: "",
};

export function AnulacionWizard() {
  const [step, setStep] = useState(0);
  const [datos, setDatos] = useState<AnulacionSchema | null>(null);

  const methods = useForm<AnulacionSchema>({
    resolver: zodResolver(anulacionSchema) as Resolver<AnulacionSchema>,
    defaultValues,
    mode: "onBlur",
  });

  async function goNext() {
    const valid = await methods.trigger();
    if (!valid) return;
    const parsed = anulacionSchema.safeParse(methods.getValues());
    if (!parsed.success) return;
    setDatos(parsed.data);
    setStep(1);
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <StepIndicator steps={STEPS} current={step} />

        {step === 0 && <StepFormularioAnulacion />}
        {step === 1 && datos && (
          <StepRevisionDocumento
            contenido={buildAnulacionContenido(datos)}
            endpoint="/api/anulacion/export"
            datos={datos}
            archivoPorDefecto="Anulacion"
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
