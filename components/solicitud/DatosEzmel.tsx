import { MUTUANTE_INFO } from "@/lib/data/contratoFijo";

function Linea({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:pt-0.5">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

/** Primer bloque de la página: quiénes somos. */
export function DatosEzmel() {
  return (
    <section aria-labelledby="ezmel-titulo" className="overflow-hidden rounded-2xl border border-brand-border bg-white">
      <div className="bg-gradient-to-br from-[#237082] to-[#1a5f6f] px-6 py-6 text-white">
        <h1 id="ezmel-titulo" className="text-2xl font-bold leading-tight sm:text-3xl">
          Pedí tu préstamo con EzMel
        </h1>
        <p className="mt-2 text-sm text-white/90 sm:text-base">
          Mirá los requisitos, simulá tu cuota y conocé el cronograma de pagos antes de avanzar.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <dl className="space-y-3">
          <Linea label="Empresa">
            {MUTUANTE_INFO.nombreComercial}
            <span className="block text-xs font-normal text-slate-600">
              {MUTUANTE_INFO.razonSocial} · CUIT {MUTUANTE_INFO.cuit}
            </span>
          </Linea>
          <Linea label="Domicilio">Zufriategui 834, local 9, Ituzaingó - Provincia de Buenos Aires</Linea>
        </dl>

      </div>
    </section>
  );
}
