"use client";

import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { DateField } from "@/components/ui/DateField";
import { Select } from "@/components/ui/Select";
import { cotizar, type Cotizacion } from "@/lib/cotizador/calcular";
import { MODALIDADES, maxCuotas, type Modalidad } from "@/lib/cotizador/config";
import { parseMontoAR } from "@/lib/format/montoAR";
import {
  enlaceWhatsApp,
  enlaceWhatsAppWeb,
  mensajeCotizacion,
  numeroWhatsApp,
  pesosPantalla,
  porcentaje0,
  porcentaje1,
} from "@/lib/mensajes/cotizacion";
import { TablaCronograma } from "./TablaCronograma";

interface Valores {
  celular: string;
  monto: string;
  modalidad: Modalidad;
  cuotas: number | string;
  fechaPrestamo: string;
}

const OPCIONES_MODALIDAD = (Object.keys(MODALIDADES) as Modalidad[]).map((m) => ({ value: m, label: MODALIDADES[m].label }));

const inputClass =
  "mt-1 w-full rounded-md border border-brand-border px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none";

const pad = (n: number) => String(n).padStart(2, "0");
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-brand-border bg-white">
      <h2 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{titulo}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-brand-border py-2 last:border-b-0">
      <dt className="text-sm text-slate-600">{etiqueta}</dt>
      <dd className="text-right text-sm font-bold text-slate-900">{valor}</dd>
    </div>
  );
}

/**
 * Mensaje predeterminado "Préstamo": se cargan los datos del préstamo, se calcula la cotización con las
 * fórmulas del Excel del cotizador y se abre el chat de WhatsApp del cliente con el mensaje ya escrito.
 */
export function CotizacionWhatsApp({ onCotizacion }: { onCotizacion?: (c: Cotizacion | null) => void }) {
  const methods = useForm<Valores>({
    defaultValues: { celular: "", monto: "300000", modalidad: "mensual", cuotas: 3, fechaPrestamo: "" },
  });
  const { register, control, setValue } = methods;
  const [copiado, setCopiado] = useState(false);

  // La fecha arranca con la de hoy. Se completa acá (y no en el valor inicial) para no desfasar el render del servidor.
  useEffect(() => {
    setValue("fechaPrestamo", hoy());
  }, [setValue]);

  const celular = useWatch({ control, name: "celular" });
  const montoTexto = useWatch({ control, name: "monto" });
  const modalidad = useWatch({ control, name: "modalidad" });
  const cuotas = Number(useWatch({ control, name: "cuotas" }));
  const fechaPrestamo = useWatch({ control, name: "fechaPrestamo" });

  const monto = parseMontoAR(montoTexto);
  const maximo = maxCuotas(modalidad);
  const cotizacion = useMemo(
    () => (monto && fechaPrestamo ? cotizar(monto, modalidad, cuotas, fechaPrestamo) : null),
    [monto, modalidad, cuotas, fechaPrestamo]
  );
  const mensaje = cotizacion ? mensajeCotizacion(cotizacion) : "";

  // El panel de la derecha muestra el cronograma: se le avisa cada vez que cambia la cotización.
  useEffect(() => {
    onCotizacion?.(cotizacion);
  }, [cotizacion, onCotizacion]);
  const numero = numeroWhatsApp(celular);
  const enlace = numero && mensaje ? enlaceWhatsApp(numero, mensaje) : null;
  const enlaceWeb = numero && mensaje ? enlaceWhatsAppWeb(numero, mensaje) : null;

  function cambiarModalidad(nueva: Modalidad) {
    setValue("modalidad", nueva);
    // Cada modalidad tiene un máximo de cuotas distinto (16 semanas, 8 quincenas o 4 meses).
    if (cuotas > maxCuotas(nueva)) setValue("cuotas", maxCuotas(nueva));
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const problema = !monto
    ? "Ingresá el monto del préstamo."
    : !cotizacion
      ? `Revisá el plan: hasta ${maximo} ${MODALIDADES[modalidad].unidad[1]} (${MODALIDADES[modalidad].label.toLowerCase()}).`
      : null;

  return (
    <FormProvider {...methods}>
      <div className="space-y-5">
        <Seccion titulo="Datos del préstamo">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <label className="block">
              <span className="block text-sm font-semibold text-slate-900">Celular (sin 0 ni 15)</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="11 2345 6789"
                className={inputClass}
                {...register("celular")}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-900">Monto préstamo ($)</span>
              <input type="text" inputMode="decimal" className={inputClass} {...register("monto")} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-900">Modalidad</span>
              <Select
                className="mt-1"
                redondeo="md"
                value={modalidad}
                onChange={cambiarModalidad}
                opciones={OPCIONES_MODALIDAD}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-900">Cantidad de cuotas</span>
              <input type="number" step="1" min="1" max={maximo} className={inputClass} {...register("cuotas")} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-900">Fecha del préstamo</span>
              <DateField name="fechaPrestamo" className={inputClass} />
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Celular: código de área y número, sin 0 ni 15 (ej. 11 2345 6789). Máximo 16 semanas, 8 quincenas o 4 meses.
          </p>
          {celular && !numero && (
            <p className="mt-1 text-xs text-amber-700">
              El celular no es válido: escribí el código de área y el número, sin 0 ni 15 (10 dígitos en total).
            </p>
          )}
          {problema && <p className="mt-1 text-sm text-amber-700">{problema}</p>}
        </Seccion>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Seccion titulo="Resultado">
              {cotizacion ? (
                <dl>
                  <Fila etiqueta="Valor de cada cuota" valor={pesosPantalla(cotizacion.valorCuota)} />
                  <Fila etiqueta="Total a devolver" valor={pesosPantalla(cotizacion.totalAPagar)} />
                  <Fila etiqueta="Interés" valor={porcentaje1(cotizacion.interes)} />
                  <Fila etiqueta="Interés en pesos" valor={pesosPantalla(cotizacion.interesPesos)} />
                  <Fila etiqueta="IVA intereses (21%)" valor={pesosPantalla(cotizacion.ivaPesos)} />
                  <Fila etiqueta="TNA" valor={porcentaje1(cotizacion.tna)} />
                  <Fila etiqueta="TEA" valor={porcentaje0(cotizacion.tea)} />
                  <Fila etiqueta="TEM" valor={porcentaje1(cotizacion.tem)} />
                  <Fila etiqueta="CFT" valor={porcentaje0(cotizacion.cft)} />
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Completá los datos para ver la cotización.</p>
              )}
            </Seccion>

            {/* En pantallas anchas el cronograma va en la columna de la derecha (MensajesPanel); acá, en las chicas. */}
            {cotizacion && (
              <div className="xl:hidden">
                <Seccion titulo="Cronograma de pagos">
                  <TablaCronograma cronograma={cotizacion.cronograma} />
                </Seccion>
              </div>
            )}
          </div>

        <Seccion titulo="Mensaje (vista previa)">
          {mensaje ? (
            <div className="max-w-md rounded-2xl rounded-tl-sm bg-[#d9fdd3] px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-sm">
              <p className="whitespace-pre-wrap break-words">{mensaje}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">El mensaje aparece cuando el plan es válido.</p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {enlace && enlaceWeb ? (
              <>
                <a
                  href={enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                >
                  Enviar por WhatsApp (app de escritorio)
                </a>
                <a
                  href={enlaceWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 sm:w-auto"
                >
                  Enviar por WhatsApp Web
                </a>
              </>
            ) : (
              <span
                aria-disabled
                className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 sm:w-auto"
              >
                Enviar por WhatsApp
              </span>
            )}
            <button
              type="button"
              onClick={copiar}
              disabled={!mensaje}
              className="min-h-11 w-full rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-40 sm:w-auto"
            >
              {copiado ? "Copiado" : "Copiar mensaje"}
            </button>
          </div>
          {!enlace && mensaje && <p className="mt-2 text-xs text-slate-500">Ingresá un celular válido para abrir WhatsApp.</p>}
          <p className="mt-3 text-xs text-slate-500">
            Completá los datos del préstamo, revisá el mensaje y tocá Enviar por WhatsApp: se abre la app de escritorio con el
            chat del cliente y el mensaje ya escrito (la primera vez, tildá «Permitir siempre»). Si esta computadora no tiene
            la app, usá WhatsApp Web. Los datos no se guardan en la plataforma.
          </p>
        </Seccion>
        </div>
      </div>
    </FormProvider>
  );
}
