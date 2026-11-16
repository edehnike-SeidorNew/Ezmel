"use client";

import { useState, type ReactNode } from "react";
import { CardLateral } from "@/components/layout/CardLateral";
import { PercentIcon } from "@/components/layout/icons";
import { PanelOpciones } from "@/components/layout/PanelOpciones";
import {
  ETIQUETA_TIPO,
  TIPOS_CLIENTE,
  interesDeSemana,
  pesosEnteros,
  porcentaje1,
  porcentaje3,
  porcentajeCorto,
  tablaIntereses,
  type Tasas,
  type TipoCliente,
} from "@/lib/tasas/tipos";

const OPCIONES = [
  { id: "nuevo", label: ETIQUETA_TIPO.nuevo, titulo: "Tasas de clientes nuevos", Icon: PercentIcon },
  { id: "antiguo", label: ETIQUETA_TIPO.antiguo, titulo: "Tasas de clientes antiguos", Icon: PercentIcon },
] as const;

/** Notas de la hoja "Tasas" de los Excel, sobre cómo se calculan TNA, TEA, TEM y CFT. */
const NOTAS_CALCULO = [
  "Quincenal usa el interés de 2× semanas; mensual el de 4× semanas.",
  "Se puede escribir un valor a mano en la tabla para un plazo especial.",
  "TNA, TEA, TEM y CFT (hojas Cotizador y WhatsApp): sistema francés (cuota fija).",
  "Semana = 7 días, quincena = 15, mes = 30, año = 365.",
  "TNA = tasa del período × 365 / días. TEA y TEM capitalizan esa tasa a 365 y 30 días.",
  "CFT = TEA sobre lo que recibe el cliente (monto − gastos) contra las cuotas que paga.",
  "Interés $ = (total − monto) / 1,21 · IVA $ = interés $ × 21% (IVA incluido en la cuota).",
];

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-brand-border bg-white">
      <h2 className="bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{titulo}</h2>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

function Parametro({ nombre, valor, nota }: { nombre: string; valor: string; nota: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 border-b border-brand-border py-3 last:border-b-0">
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-slate-900">{nombre}</dt>
        <p className="mt-0.5 text-xs text-slate-500">{nota}</p>
      </div>
      <dd className="min-w-24 rounded-md bg-brand-soft px-3 py-1.5 text-right text-sm font-bold text-slate-900">{valor}</dd>
    </div>
  );
}

/** Tabla SEMANAS / INTERÉS del Excel. `manual` marca los plazos que se escribieron a mano. */
function TablaSemanas({ t }: { t: Tasas }) {
  return (
    // Scroll interno: la tabla tiene hasta 20 filas y no tiene que alargar la pantalla; el encabezado queda fijo.
    <div className="max-h-96 overflow-y-auto rounded-md border border-brand-border">
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 bg-brand-soft text-xs uppercase tracking-wide text-brand">
        <tr>
          <th className="bg-brand-soft px-3 py-2 font-semibold">Semanas</th>
          <th className="bg-brand-soft px-3 py-2 text-right font-semibold">Interés</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border">
        {tablaIntereses(t).map((fila) => (
          <tr key={fila.semana}>
            <td className="px-3 py-1 text-slate-700">{fila.semana}</td>
            <td className="px-3 py-1 text-right font-semibold text-slate-900">
              {porcentaje1(fila.interes)}
              {fila.manual && <span className="ml-2 text-xs font-normal text-amber-700">manual</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function fecha(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
}

/** Hoja de tasas de un tipo de cliente, con el mismo orden y las mismas notas que el Excel. */
function Planilla({ t }: { t: Tasas }) {
  const ultima = interesDeSemana(t, t.maxSemanas);
  const meses = t.maxSemanas === 16 ? " (4 meses)" : "";
  const modificada = fecha(t.actualizadoEn);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <Seccion titulo="Parámetros de tasas">
          <p className="mb-2 text-xs text-slate-500">
            Uso interno · {modificada ? `Última modificación: ${modificada}` : "Valores iniciales"}
          </p>
          <dl>
            <Parametro nombre="Interés 1 semana" valor={porcentaje1(t.interes1Semana)} nota="Interés total del préstamo a 1 cuota semanal" />
            <Parametro
              nombre="Interés adicional por semana"
              valor={porcentaje3(t.interesAdicionalSemana)}
              nota={`Parejo de la semana 1 a la ${t.maxSemanas} → ${porcentajeCorto(ultima)} a ${t.maxSemanas} semanas${meses}`}
            />
            <Parametro nombre="Redondeo de cuota (múltiplo de $)" valor={pesosEnteros(t.redondeoCuota)} nota="1 = al peso · 10 o 100 = cuotas redondas" />
            <Parametro
              nombre="Gastos de otorgamiento (% del monto)"
              valor={porcentaje1(t.gastosOtorgamiento)}
              nota="Para el CFT. Lo que se descuenta del monto al entregarlo (0% = sin gastos)."
            />
            <Parametro
              nombre="IVA sobre intereses"
              valor={porcentajeCorto(t.iva)}
              nota="Incluido en la cuota: de lo que se cobra de más, una parte es interés y otra el IVA."
            />
          </dl>
        </Seccion>

      <Seccion titulo="Cómo se calcula">
        <ul className="space-y-2.5">
          {NOTAS_CALCULO.map((nota) => (
            <li key={nota} className="flex gap-2 text-sm text-slate-700">
              <span aria-hidden className="mt-0.5 text-brand">
                •
              </span>
              <span>{nota}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Por ahora las tasas se muestran en esta pantalla. Los cotizadores de la plataforma siguen usando sus valores
          actuales (los de clientes nuevos).
        </p>
      </Seccion>
      </div>

      {/* En pantallas anchas la tabla va en la columna de la derecha (TasasPanel); acá, en las chicas. */}
      <div className="xl:hidden">
        <Seccion titulo="Interés por semanas">
          <TablaSemanas t={t} />
        </Seccion>
      </div>
    </div>
  );
}

/** Sección "Tasas": las hojas de clientes nuevos y de clientes antiguos, con el formato del Excel. */
export function TasasPanel({ tasas }: { tasas: Record<TipoCliente, Tasas> }) {
  const [tipo, setTipo] = useState<TipoCliente>(TIPOS_CLIENTE[0]);
  const actual = OPCIONES.find((o) => o.id === tipo) ?? OPCIONES[0];

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <PanelOpciones
        titulo="Tipo de cliente"
        opciones={OPCIONES}
        seleccion={tipo}
        onSelect={setTipo}
        desplazamiento="xl:mt-14"
        fija={false}
      >
        {/* Sólo en pantallas anchas; en las chicas la tabla va dentro del contenido, debajo de los parámetros. */}
        <div className="hidden xl:block">
          <CardLateral titulo="Interés por semanas">
            <TablaSemanas t={tasas[tipo]} />
          </CardLateral>
        </div>
      </PanelOpciones>

      <div className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-bold text-brand">{actual.titulo}</h1>
        <Planilla t={tasas[tipo]} />
      </div>
    </div>
  );
}
