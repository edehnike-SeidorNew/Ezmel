"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { Cotizador as CotizadorComponent } from "./Cotizador";

// Solo en el navegador: usa la fecha de hoy del usuario, que en el servidor puede ser otra (huso horario).
const Cotizador = dynamic(() => import("./Cotizador").then((m) => m.Cotizador), {
  ssr: false,
  loading: () => (
    <section id="cotizador" className="scroll-mt-20">
      <h2 className="text-2xl font-bold text-brand">Cotizá tu préstamo</h2>
      <div className="mt-5 h-64 animate-pulse rounded-2xl border border-brand-border bg-white" />
    </section>
  ),
});

export function CotizadorCarga(props: ComponentProps<typeof CotizadorComponent>) {
  return <Cotizador {...props} />;
}
