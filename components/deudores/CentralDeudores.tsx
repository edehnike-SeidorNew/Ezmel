"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@/components/layout/icons";
import { cuitValido, formatearCuit, soloDigitosCuit } from "@/lib/bcra/cuit";
import {
  SITUACIONES,
  type CausalCheques,
  type ConsultaDeudores,
  type DeudaActual,
  type Parte,
  type PeriodoHistorico,
} from "@/lib/bcra/tipos";

const enteros = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const pesos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** El BCRA informa los montos en MILES de pesos: 1.093 significa $ 1.093.000. Se muestran siempre en pesos. */
const enPesos = (miles: number) =>
  `$ ${enteros.format(Math.round(miles * 1000))}`;

/** "202609" -> "09/26" */
const periodoCorto = (p: string) =>
  p.length === 6 ? `${p.slice(4)}/${p.slice(2, 4)}` : p;
/** "2015-12-30" -> "12/2015" */
const mesAnio = (iso: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[1]}` : iso;
};
const fechaCorta = (iso: string | null) => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

const COLOR_SITUACION: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  2: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  3: "bg-orange-100 text-orange-800 ring-orange-300",
  4: "bg-red-100 text-red-800 ring-red-300",
  5: "bg-red-800 text-white ring-red-900",
};

function Situacion({
  n,
  conTitulo = false,
}: {
  n: number;
  conTitulo?: boolean;
}) {
  const info = SITUACIONES[n];
  if (!info) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${COLOR_SITUACION[n]}`}
      title={`Situación ${n}: ${info.detalle}`}
    >
      {n}
      {conTitulo && <span className="font-medium">· {info.titulo}</span>}
    </span>
  );
}

/** Bloque con título. Si es `plegable` se abre y se cierra tocando el encabezado (arranca cerrado). */
function Seccion({
  titulo,
  nota,
  plegable = false,
  resumen,
  children,
}: {
  titulo: string;
  nota?: string;
  plegable?: boolean;
  /** Texto corto en el encabezado, útil cuando la sección está cerrada. */
  resumen?: string;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(!plegable);

  return (
    <section className="overflow-hidden rounded-lg border border-brand-border bg-white">
      {plegable ? (
        <h2>
          <button
            type="button"
            onClick={() => setAbierta((a) => !a)}
            aria-expanded={abierta}
            className="flex w-full items-center justify-between gap-3 bg-brand px-5 py-2.5 text-left text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover"
          >
            <span>
              {titulo}
              {resumen && (
                <span className="ml-3 hidden text-xs font-normal normal-case tracking-normal text-white/80 sm:inline">
                  {resumen}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium normal-case tracking-normal">
              {abierta ? "Ocultar" : "Ver"}
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform ${abierta ? "rotate-90" : ""}`}
              />
            </span>
          </button>
        </h2>
      ) : (
        <h2 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">
          {titulo}
        </h2>
      )}
      {abierta && (
        <div className="p-5">
          {nota && <p className="mb-3 text-xs text-slate-500">{nota}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

function Sin({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {children}
    </p>
  );
}

function ErrorParte({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>{mensaje}</span>
      <button
        type="button"
        onClick={onReintentar}
        className="font-semibold text-brand underline-offset-2 hover:underline"
      >
        Reintentar
      </button>
    </div>
  );
}

/** Muestra una parte de la consulta: los datos, "sin registros" o el error con su reintento. */
function ParteVista<T>({
  parte,
  sinRegistros,
  onReintentar,
  children,
}: {
  parte: Parte<T>;
  sinRegistros: string;
  onReintentar: () => void;
  children: (datos: T) => ReactNode;
}) {
  if (parte.estado === "error")
    return <ErrorParte mensaje={parte.mensaje} onReintentar={onReintentar} />;
  if (parte.estado === "sin-registros") return <Sin>{sinRegistros}</Sin>;
  return <>{children(parte.datos)}</>;
}

/** Par título/valor para las tarjetas que reemplazan a las tablas en pantallas angostas. */
function Dato({
  titulo,
  children,
  ancho = false,
}: {
  titulo: string;
  children: ReactNode;
  ancho?: boolean;
}) {
  return (
    <div className={ancho ? "col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </dt>
      <dd className="mt-0.5 break-words font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}

function TablaActual({ deuda }: { deuda: DeudaActual }) {
  return (
    <>
      {/* Celular y tablet: una tarjeta por entidad (la tabla no entra sin scroll lateral). */}
      <ul className="space-y-3 lg:hidden">
        {deuda.entidades.map((e) => (
          <li
            key={e.entidad}
            className="rounded-lg border border-brand-border p-3"
          >
            <p className="font-semibold text-slate-900">{e.entidad}</p>
            <div className="mt-2">
              <Situacion n={e.situacion} conTitulo />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Dato titulo="Período">{periodoCorto(deuda.periodo)}</Dato>
              <Dato titulo="Monto ($)">{enPesos(e.monto)}</Dato>
              <Dato titulo="Días de atraso">{e.diasAtraso ?? "N/A"}</Dato>
              <Dato titulo="Observaciones" ancho>
                {e.observaciones.length > 0 ? e.observaciones.join(", ") : "—"}
              </Dato>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Entidad</th>
              <th className="px-3 py-2.5 font-semibold">Período</th>
              <th className="px-3 py-2.5 font-semibold">Situación</th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Monto ($)
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Días de atraso
              </th>
              <th className="px-3 py-2.5 font-semibold">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {deuda.entidades.map((e) => (
              <tr key={e.entidad}>
                <td className="px-3 py-3 font-semibold text-slate-900">
                  {e.entidad}
                </td>
                <td className="px-3 py-3 text-slate-800">
                  {periodoCorto(deuda.periodo)}
                </td>
                <td className="px-3 py-3">
                  <Situacion n={e.situacion} conTitulo />
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">
                  {enPesos(e.monto)}
                </td>
                <td className="px-3 py-3 text-right text-slate-800">
                  {e.diasAtraso ?? "N/A"}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {e.observaciones.length > 0
                    ? e.observaciones.join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deuda.entidades
        .filter((e) => e.situacion === 1 && e.fechaSit1)
        .map((e) => (
          <p key={e.entidad} className="mt-3 text-xs text-slate-600">
            {e.entidad}: permanece en Situación 1 (normal), o sin figurar en la
            Central en períodos intermedios, desde{" "}
            {mesAnio(e.fechaSit1 as string)}.
          </p>
        ))}
    </>
  );
}

/** Matriz de los últimos meses: una fila por período y una columna por entidad. */
function TablaHistorica({ periodos }: { periodos: PeriodoHistorico[] }) {
  const entidades = [
    ...new Set(periodos.flatMap((p) => p.entidades.map((e) => e.entidad))),
  ];
  return (
    <>
      {/* Celular y tablet: un bloque por período con sus entidades en lista. */}
      <ul className="space-y-3 lg:hidden">
        {periodos.map((p) => {
          const conDeuda = p.entidades.filter(
            (e) => !(e.situacion === 0 && e.monto === 0),
          );
          return (
            <li
              key={p.periodo}
              className="rounded-lg border border-brand-border p-3"
            >
              <p className="text-sm font-bold text-brand">
                {periodoCorto(p.periodo)}
              </p>
              {conDeuda.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">
                  Sin deuda en el período
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-brand-border">
                  {conDeuda.map((e) => (
                    <li
                      key={e.entidad}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0 break-words text-slate-900">
                        {e.entidad}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Situacion n={e.situacion} />
                        <span className="text-slate-800">
                          {enPesos(e.monto)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto lg:block">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: 140 + entidades.length * 130 }}
        >
          <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
            <tr>
              <th className="sticky left-0 bg-brand-soft px-3 py-2.5 font-semibold">
                Período
              </th>
              {entidades.map((e) => (
                <th
                  key={e}
                  className="px-3 py-2.5 font-semibold normal-case tracking-normal"
                >
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {periodos.map((p) => (
              <tr key={p.periodo}>
                <th
                  scope="row"
                  className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-900"
                >
                  {periodoCorto(p.periodo)}
                </th>
                {entidades.map((nombre) => {
                  const e = p.entidades.find((x) => x.entidad === nombre);
                  return (
                    <td key={nombre} className="px-3 py-2">
                      {e ? (
                        e.situacion === 0 && e.monto === 0 ? (
                          <span
                            className="text-slate-400"
                            title="Sin deuda en el período"
                          >
                            —
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Situacion n={e.situacion} />
                            <span className="text-slate-800">
                              {enPesos(e.monto)}
                            </span>
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TablaCheques({ causales }: { causales: CausalCheques[] }) {
  return (
    <div className="space-y-4">
      {causales.map((c) => (
        <div key={c.causal}>
          <h3 className="mb-2 text-sm font-bold text-red-800">{c.causal}</h3>
          {/* Celular y tablet: una tarjeta por cheque. */}
          <ul className="space-y-3 xl:hidden">
            {c.entidades.flatMap((e) =>
              e.cheques.map((ch, i) => (
                <li
                  key={`${e.entidad}-${ch.numero ?? i}-${i}`}
                  className="rounded-lg border border-brand-border p-3"
                >
                  <p className="font-semibold text-slate-900">{e.entidad}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Dato titulo="N° de cheque">{ch.numero ?? "—"}</Dato>
                    <Dato titulo="Monto ($)">
                      {ch.monto === null ? "—" : pesos.format(ch.monto)}
                    </Dato>
                    <Dato titulo="Fecha de rechazo">
                      {fechaCorta(ch.fechaRechazo)}
                    </Dato>
                    <Dato titulo="Levantado el">
                      {fechaCorta(ch.fechaPago)}
                    </Dato>
                    <Dato titulo="Multa" ancho>
                      {ch.fechaPagoMulta
                        ? `Pagada el ${fechaCorta(ch.fechaPagoMulta)}`
                        : (ch.estadoMulta ?? "—")}
                    </Dato>
                    <Dato titulo="Observaciones" ancho>
                      {[
                        ch.denominacionJuridica &&
                          `Empresa: ${ch.denominacionJuridica}`,
                        ch.enRevision && "En revisión",
                        ch.procesoJudicial && "Proceso judicial",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </Dato>
                  </dl>
                </li>
              )),
            )}
          </ul>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Banco</th>
                  <th className="px-3 py-2.5 font-semibold">N° de cheque</th>
                  <th className="px-3 py-2.5 font-semibold">
                    Fecha de rechazo
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Monto ($)
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Levantado el</th>
                  <th className="px-3 py-2.5 font-semibold">Multa</th>
                  <th className="px-3 py-2.5 font-semibold">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {c.entidades.flatMap((e) =>
                  e.cheques.map((ch, i) => (
                    <tr key={`${e.entidad}-${ch.numero ?? i}-${i}`}>
                      <td className="px-3 py-2.5 text-slate-800">
                        {e.entidad}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {ch.numero ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800">
                        {fechaCorta(ch.fechaRechazo)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                        {ch.monto === null ? "—" : pesos.format(ch.monto)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800">
                        {fechaCorta(ch.fechaPago)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {ch.fechaPagoMulta
                          ? `Pagada el ${fechaCorta(ch.fechaPagoMulta)}`
                          : (ch.estadoMulta ?? "—")}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {[
                          ch.denominacionJuridica &&
                            `Empresa: ${ch.denominacionJuridica}`,
                          ch.enRevision && "En revisión",
                          ch.procesoJudicial && "Proceso judicial",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Resumen({ consulta }: { consulta: ConsultaDeudores }) {
  const actual = consulta.actual.estado === "ok" ? consulta.actual.datos : null;
  const peor = actual
    ? Math.max(...actual.entidades.map((e) => e.situacion))
    : null;
  const total = actual
    ? actual.entidades.reduce((suma, e) => suma + e.monto, 0)
    : 0;
  // Sin registros es un resultado (ninguno); solo un error de la consulta deja el dato como no disponible.
  const cheques =
    consulta.cheques.estado === "ok"
      ? consulta.cheques.datos.reduce(
          (n, c) => n + c.entidades.reduce((m, e) => m + e.cheques.length, 0),
          0,
        )
      : consulta.cheques.estado === "sin-registros"
        ? 0
        : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border bg-white">
      <div className="bg-gradient-to-br from-[#237082] to-[#1a5f6f] px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-wide text-white/70">
          Central de Deudores del Sistema Financiero
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">
          {consulta.denominacion ?? "Sin denominación"}
        </h2>
        <p className="mt-1 text-sm text-white/85">
          CUIT / CUIL / CDI {formatearCuit(consulta.identificacion)}
        </p>
      </div>
      <dl className="grid grid-cols-1 divide-y divide-brand-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-6 py-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Situación actual
          </dt>
          <dd className="mt-1.5">
            {consulta.actual.estado === "error" ? (
              <span className="text-sm text-amber-800">No disponible</span>
            ) : peor ? (
              <div>
                <Situacion n={peor} conTitulo />
                <p className="mt-1 text-xs text-slate-500">
                  La más alta entre las entidades informadas.
                </p>
              </div>
            ) : (
              <span className="text-sm font-semibold text-emerald-700">
                Sin deudas informadas
              </span>
            )}
          </dd>
        </div>
        <div className="px-6 py-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Deuda informada
          </dt>
          <dd className="mt-1.5 text-lg font-bold text-brand">
            {actual
              ? enPesos(total)
              : consulta.actual.estado === "error"
                ? "—"
                : "$ 0"}
          </dd>
          {actual && (
            <p className="text-xs text-slate-500">
              En {actual.entidades.length}{" "}
              {actual.entidades.length === 1 ? "entidad" : "entidades"} ·
              período {periodoCorto(actual.periodo)}
            </p>
          )}
        </div>
        <div className="px-6 py-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cheques rechazados
          </dt>
          <dd className="mt-1.5 text-lg font-bold">
            {cheques === null ? (
              <span className="text-sm font-normal text-amber-800">
                No disponible
              </span>
            ) : cheques === 0 ? (
              <span className="text-emerald-700">Ninguno</span>
            ) : (
              <span className="text-red-700">{cheques}</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Cargando() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="h-40 animate-pulse rounded-2xl border border-brand-border bg-white" />
      <div className="h-56 animate-pulse rounded-lg border border-brand-border bg-white" />
      <p className="text-center text-sm text-slate-500">Consultando el BCRA…</p>
    </div>
  );
}

type Estado =
  | { fase: "vacio" }
  | { fase: "cargando" }
  | { fase: "listo"; consulta: ConsultaDeudores }
  | { fase: "error"; mensaje: string };

/**
 * Consulta de la Central de Deudores del BCRA por CUIT / CUIL / CDI: situación actual, historia de 24 meses
 * y cheques rechazados. La consulta pasa por el servidor de EzMel y no se guarda.
 */
export function CentralDeudores() {
  const [cuitTexto, setCuitTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ fase: "vacio" });

  async function consultar(digitos: string) {
    setEstado({ fase: "cargando" });
    try {
      const respuesta = await fetch(
        `/api/bcra/central-deudores?cuit=${digitos}`,
        { cache: "no-store" },
      );
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setEstado({
          fase: "error",
          mensaje:
            respuesta.status === 401 || respuesta.redirected
              ? "Tu sesión venció. Volvé a iniciar sesión."
              : (cuerpo?.error ??
                "No se pudo consultar el BCRA. Probá de nuevo en un momento."),
        });
        return;
      }
      setEstado({ fase: "listo", consulta: cuerpo as ConsultaDeudores });
    } catch {
      setEstado({
        fase: "error",
        mensaje: "No se pudo conectar. Revisá tu conexión y probá de nuevo.",
      });
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = soloDigitosCuit(cuitTexto);
    if (!cuitValido(digitos)) {
      setError(
        digitos.length < 11
          ? "Ingresá los 11 dígitos del CUIT / CUIL."
          : "El CUIT / CUIL no es válido. Revisá los números.",
      );
      return;
    }
    setError(null);
    void consultar(digitos);
  }

  const consulta = estado.fase === "listo" ? estado.consulta : null;
  const reintentar = () => consulta && void consultar(consulta.identificacion);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">Central de deudores</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consultá la situación crediticia de una persona o empresa en el
          sistema financiero, con los datos del Banco Central (BCRA).
        </p>
      </div>

      <form
        onSubmit={enviar}
        noValidate
        className="rounded-lg border border-brand-border bg-white p-5"
      >
        <label
          htmlFor="cuit"
          className="block text-sm font-semibold text-slate-900"
        >
          CUIT / CUIL / CDI
        </label>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row">
          <input
            id="cuit"
            inputMode="numeric"
            autoComplete="off"
            placeholder="20-12345678-9"
            value={cuitTexto}
            onChange={(e) => {
              setCuitTexto(formatearCuit(e.target.value));
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "cuit-error" : undefined}
            className="w-full rounded-md border border-brand-border px-4 py-3 text-lg font-semibold tracking-wide text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#6ACEC6]/40 sm:max-w-sm"
          />
          <button
            type="submit"
            disabled={estado.fase === "cargando"}
            className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {estado.fase === "cargando" ? "Consultando…" : "Consultar"}
          </button>
        </div>
        {error && (
          <p id="cuit-error" role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Los datos se consultan en el momento y no se guardan en la plataforma.
        </p>
      </form>

      {estado.fase === "cargando" && <Cargando />}

      {estado.fase === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          {estado.mensaje}
        </p>
      )}

      {consulta && (
        <div className="space-y-5">
          <Resumen consulta={consulta} />
          <p className="text-xs text-slate-500">
            Consulta del{" "}
            {new Date(consulta.consultadoEn).toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            })}{" "}
            · Fuente: Central de Deudores del Sistema Financiero, BCRA
          </p>

          <Seccion
            titulo="Situación actual"
            nota="Último período informado. Los montos están en pesos (el BCRA los informa en miles: 1.093 equivale a $ 1.093.000)."
          >
            <ParteVista
              parte={consulta.actual}
              sinRegistros="No hay deudas informadas para este CUIT en la Central de Deudores."
              onReintentar={reintentar}
            >
              {(deuda) => <TablaActual deuda={deuda} />}
            </ParteVista>
          </Seccion>

          <Seccion
            titulo="Historia de los últimos 24 meses"
            nota="Situación y monto (en pesos) por entidad y por mes. El BCRA informa los montos en miles de pesos."
            plegable
            resumen={
              consulta.historica.estado === "ok"
                ? `${consulta.historica.datos.length} períodos · ${
                    new Set(
                      consulta.historica.datos.flatMap((p) =>
                        p.entidades.map((e) => e.entidad),
                      ),
                    ).size
                  } entidades`
                : undefined
            }
          >
            <ParteVista
              parte={consulta.historica}
              sinRegistros="No hay historial informado en los últimos 24 meses."
              onReintentar={reintentar}
            >
              {(periodos) => <TablaHistorica periodos={periodos} />}
            </ParteVista>
          </Seccion>

          <Seccion titulo="Cheques rechazados">
            <ParteVista
              parte={consulta.cheques}
              sinRegistros="No existen registros de cheques rechazados para esta consulta."
              onReintentar={reintentar}
            >
              {(causales) => <TablaCheques causales={causales} />}
            </ParteVista>
          </Seccion>

          <Seccion titulo="¿Qué significa cada situación?">
            <ul className="space-y-3 text-sm text-slate-700">
              {Object.entries(SITUACIONES).map(([n, s]) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    <Situacion n={Number(n)} />
                  </span>
                  <span>
                    <strong className="text-slate-900">{s.titulo}.</strong>{" "}
                    <span className="text-slate-600">{s.detalle}.</span>
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>

          <p className="text-xs leading-relaxed text-slate-500">
            La información proviene de la Central de Deudores del Sistema
            Financiero y de la Central de cheques rechazados del BCRA; su
            difusión no implica conformidad por parte del Banco Central. Los
            cheques rechazados se publican sin alteraciones, de acuerdo con el
            art. 26, inc. 4 de la Ley 25.326 de Protección de los Datos
            Personales. Los datos “En revisión” o “Proceso judicial” están
            sometidos a revisión (Ley 25.326, art. 16, inc. 6) o a proceso
            judicial (art. 38, inc. 3). Los derechos de rectificación,
            actualización, supresión y confidencialidad deben ejercerse ante la
            entidad cedente que sea parte en la relación jurídica a que se
            refiere el dato impugnado. Más información en{" "}
            <a
              href="https://www.bcra.gob.ar/situacion-crediticia/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline-offset-2 hover:underline"
            >
              bcra.gob.ar/situacion-crediticia
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
