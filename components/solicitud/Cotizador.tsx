"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cotizar } from "@/lib/cotizador/calcular";
import { MODALIDADES, maxCuotas, type Modalidad } from "@/lib/cotizador/config";
import { hoyISO, type Prestamo } from "@/lib/solicitud/formulario";

const MAX_DIGITOS = 9;

const pesos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal1 = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const money = (n: number) => `$ ${pesos.format(n)}`;
const pct = (n: number | null) => (n === null ? "—" : `${decimal1.format(n * 100)} %`);

function fechaCorta(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Dato({ label, valor, destacado = false }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={destacado ? "text-base font-bold text-brand" : "text-sm font-semibold text-slate-900"}>{valor}</dd>
    </div>
  );
}

function Flecha({ lado, onClick }: { lado: "izq" | "der"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "izq" ? "Ver planes anteriores" : "Ver más planes"}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand hover:bg-brand-soft sm:flex"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={lado === "izq" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
      </svg>
    </button>
  );
}

/** Cotizador de préstamos con cronograma de pagos. Los cálculos replican el Excel de cotización. */
export function Cotizador({
  prestamo,
  onChange,
  onSolicitar,
}: {
  prestamo: Prestamo;
  onChange: (prestamo: Prestamo) => void;
  /** Lleva al formulario de solicitud. */
  onSolicitar?: () => void;
}) {
  const [hoy] = useState(hoyISO);
  const carrusel = useRef<HTMLDivElement>(null);

  const { monto, modalidad, cuotas } = prestamo;
  const limite = maxCuotas(modalidad);
  const resultado = useMemo(() => cotizar(monto, modalidad, cuotas, hoy), [monto, modalidad, cuotas, hoy]);
  // Una card por plan posible: cuántas cuotas y de cuánto es cada una.
  const planes = useMemo(
    () => Array.from({ length: limite }, (_, i) => cotizar(monto, modalidad, i + 1, hoy)),
    [monto, modalidad, limite, hoy]
  );
  const unidad = MODALIDADES[modalidad].unidad;

  // Al cambiar la modalidad, el carrusel vuelve a empezar desde la primera card.
  useEffect(() => {
    carrusel.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [modalidad]);

  function elegirModalidad(m: Modalidad) {
    onChange({ ...prestamo, modalidad: m, cuotas: Math.min(cuotas, maxCuotas(m)) });
  }

  function mover(delta: number) {
    carrusel.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section aria-labelledby="cotizador-titulo" id="cotizador" className="scroll-mt-20">
      <h2 id="cotizador-titulo" className="text-2xl font-bold text-brand">
        Cotizá tu préstamo
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Elegí el monto y cómo querés pagarlo. Te mostramos cuánto pagás y cuándo.
      </p>

      <div className="mt-5 space-y-5 rounded-2xl border border-brand-border bg-white p-5">
        <div>
          <label htmlFor="monto" className="block text-sm font-semibold text-slate-900">
            ¿Cuánto necesitás?
          </label>
          <div className="relative mt-1">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-semibold text-slate-500">
              $
            </span>
            <input
              id="monto"
              inputMode="numeric"
              autoComplete="off"
              value={monto ? pesos.format(monto) : ""}
              placeholder="0"
              onChange={(e) =>
                onChange({ ...prestamo, monto: Number(e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITOS)) || 0 })
              }
              className="w-full rounded-xl border border-brand-border py-3 pl-9 pr-4 text-xl font-bold text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#6ACEC6]/40"
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-semibold text-slate-900">¿Cómo querés pagar?</span>
          <div role="group" aria-label="Modalidad de pago" className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-brand-soft p-1">
            {(Object.keys(MODALIDADES) as Modalidad[]).map((m) => {
              const active = m === modalidad;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => elegirModalidad(m)}
                  className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition-colors ${
                    active ? "bg-brand text-white shadow" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  {MODALIDADES[m].label}
                </button>
              );
            })}
          </div>
        </div>

        {resultado && (
          <div>
            <span className="block text-sm font-semibold text-slate-900">
              Elegí tu plan <span className="font-normal text-slate-500">(hasta {limite} cuotas)</span>
            </span>

            <div className="mt-2 flex items-center gap-1">
              <Flecha lado="izq" onClick={() => mover(-384)} />
              <div
                ref={carrusel}
                role="group"
                aria-label="Planes de cuotas"
                className="flex min-w-0 flex-1 snap-x snap-proximity scroll-px-2 gap-3 overflow-x-auto scroll-smooth px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {planes.map((plan, i) => {
                  const n = i + 1;
                  const active = n === cuotas;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ ...prestamo, cuotas: n })}
                      className={`w-[180px] shrink-0 snap-start rounded-xl border px-3 py-3 text-center shadow-sm transition-colors ${
                        active
                          ? "border-brand bg-brand-soft ring-1 ring-brand"
                          : "border-brand-border bg-white hover:bg-brand-soft/60"
                      }`}
                    >
                      <span className="block text-sm text-slate-700">
                        <strong className="text-brand">{n}</strong> {n === 1 ? "cuota" : "cuotas"} de
                      </span>
                      <span className="mt-0.5 block text-base font-bold text-brand">
                        {plan ? money(plan.valorCuota) : "—"} *
                      </span>
                    </button>
                  );
                })}
              </div>
              <Flecha lado="der" onClick={() => mover(384)} />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              TNA: <strong>{pct(resultado.tna)}</strong> · TEM: <strong>{pct(resultado.tem)}</strong> · TEA:{" "}
              <strong>{pct(resultado.tea)}</strong> · CFT: <strong>{pct(resultado.cft)}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              * Sujeto a aprobación crediticia. Sistema francés (cuota fija), con el IVA sobre los intereses incluido
              en la cuota.
            </p>
          </div>
        )}
      </div>

      {resultado ? (
        <div className="mt-5 space-y-5" aria-live="polite">
          <div className="rounded-2xl bg-gradient-to-br from-[#237082] to-[#1a5f6f] p-6 text-white">
            <p className="text-sm text-white/80">
              {resultado.cuotas === 1 ? "Pagás 1 cuota" : `Pagás ${resultado.cuotas} cuotas ${modalidad === "semanal" ? "semanales" : modalidad === "quincenal" ? "quincenales" : "mensuales"}`} de
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{money(resultado.valorCuota)}</p>
            <p className="mt-3 text-sm text-white/90">
              Total a devolver: <strong>{money(resultado.totalAPagar)}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-brand-border bg-white px-5 py-3">
            <dl className="divide-y divide-brand-border">
              <Dato label="Monto del préstamo" valor={money(resultado.monto)} />
              <Dato label="Plazo" valor={`${resultado.cuotas} ${resultado.cuotas === 1 ? unidad[0] : unidad[1]}`} />
              <Dato label="Interés" valor={pct(resultado.interes)} />
              <Dato label="Total a devolver" valor={money(resultado.totalAPagar)} destacado />
            </dl>
          </div>

          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white">
            <h3 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">
              Cronograma de pagos
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    N°
                  </th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">
                    Vence
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    Cuota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {resultado.cronograma.map((c) => (
                  <tr key={c.numero}>
                    <td className="px-5 py-2.5 font-semibold text-slate-900">{c.numero}</td>
                    <td className="px-2 py-2.5 text-slate-800 first-letter:uppercase">{fechaCorta(c.fecha)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-900">{money(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-brand-border bg-brand-soft/60">
                  <td colSpan={2} className="px-5 py-3 font-bold text-brand">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-brand">{money(resultado.totalAPagar)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="border-t border-brand-border px-5 py-3 text-xs text-slate-500">
              Fechas estimadas a partir de hoy: pueden cambiar según el día en que se acredite el préstamo. Si un
              vencimiento cae en día inhábil, se pasa al primer día hábil siguiente.
            </p>
          </div>

          {onSolicitar && (
            <button
              type="button"
              onClick={onSolicitar}
              className="w-full rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-brand-hover"
            >
              Quiero solicitar este préstamo
            </button>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-brand-border bg-white px-5 py-6 text-center text-sm text-slate-500">
          Ingresá el monto que necesitás para ver tu cotización.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-slate-500">
        Valores sujetos a aprobación crediticia. Condiciones vigentes para clientes nuevos.
      </p>
    </section>
  );
}
