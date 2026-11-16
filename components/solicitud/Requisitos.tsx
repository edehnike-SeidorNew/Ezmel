"use client";

import { REQUISITOS, TIPOS, type TipoSolicitud } from "@/lib/solicitud/requisitos";

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-brand-mid">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path d="m6 10.2 2.7 2.7L14 7.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Requisitos con pestañas Personal / Comercial. */
export function Requisitos({ tipo, onTipo }: { tipo: TipoSolicitud; onTipo: (tipo: TipoSolicitud) => void }) {
  const req = REQUISITOS[tipo];

  return (
    <section aria-labelledby="requisitos-titulo" className="scroll-mt-20" id="requisitos">
      <h2 id="requisitos-titulo" className="text-center text-2xl font-bold text-brand">
        ¿Qué necesitás para pedir tu préstamo?
      </h2>
      <p className="mt-1 text-center text-sm text-slate-600">Elegí el tipo de préstamo y mirá la documentación que te vamos a pedir.</p>

      <div className="mt-5 flex justify-center">
      <div
        role="tablist"
        aria-label="Tipo de préstamo"
        className="grid w-full grid-cols-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-brand-border sm:w-auto sm:min-w-72"
      >
        {TIPOS.map((t) => {
          const active = t.id === tipo;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => onTipo(t.id)}
              className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                active ? "bg-brand text-white shadow" : "text-slate-700 hover:bg-brand-soft"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      </div>

      <div role="tabpanel" id={`panel-${tipo}`} aria-labelledby={`tab-${tipo}`} className="mt-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-900">{req.titulo}</h3>

        {/* Comercial tiene más bloques: van de a dos por fila para que no se alargue tanto. */}
        <div className={tipo === "comercial" ? "grid gap-5 md:grid-cols-2" : "space-y-5"}>
        {req.grupos.map((grupo, i) => {
          // Si queda una card sola en la última fila, va centrada respecto de las de arriba.
          const sola = tipo === "comercial" && req.grupos.length % 2 === 1 && i === req.grupos.length - 1;
          return (
          <div
            key={grupo.titulo}
            className={`h-full overflow-hidden rounded-lg border border-brand-border bg-white ${
              sola ? "md:col-span-2 md:w-[calc(50%-0.625rem)] md:justify-self-center" : ""
            }`}
          >
            <h4 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{grupo.titulo}</h4>
            <ul className="space-y-3 p-5">
              {grupo.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-800">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          );
        })}
        </div>

        <div className="space-y-3">
          {req.avisos.map((aviso) => (
            <div key={aviso.titulo} className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-bold text-amber-900">{aviso.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/90">{aviso.texto}</p>
            </div>
          ))}
        </div>

        <p className="text-sm font-medium text-slate-700">{req.cierre}</p>
      </div>
    </section>
  );
}
