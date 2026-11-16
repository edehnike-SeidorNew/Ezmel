import type { CuotaCronograma } from "@/lib/cotizador/calcular";
import { formatFechaCorta } from "@/lib/format/dateEs";
import { pesosPantalla } from "@/lib/mensajes/cotizacion";

/** Cronograma de pagos de una cotización: número de cuota, fecha de vencimiento y monto. */
export function TablaCronograma({ cronograma }: { cronograma: CuotaCronograma[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
        <tr>
          <th className="px-2 py-2 font-semibold">N°</th>
          <th className="px-2 py-2 font-semibold">Fecha</th>
          <th className="px-2 py-2 text-right font-semibold">Monto</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border">
        {cronograma.map((p) => (
          <tr key={p.numero}>
            <td className="px-2 py-1.5 text-slate-700">{p.numero}</td>
            <td className="px-2 py-1.5 text-slate-900">{formatFechaCorta(p.fecha)}</td>
            <td className="px-2 py-1.5 text-right font-semibold text-slate-900">{pesosPantalla(p.monto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
