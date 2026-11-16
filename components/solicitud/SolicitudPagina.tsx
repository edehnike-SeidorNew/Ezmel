"use client";

import Link from "next/link";
import { useState } from "react";
import type { Prestamo } from "@/lib/solicitud/formulario";
import { aQuery } from "@/lib/solicitud/parametros";
import type { TipoSolicitud } from "@/lib/solicitud/requisitos";
import { SolicitudForm } from "./SolicitudForm";

/** La página del formulario: guarda el tipo de solicitud y arma el enlace para volver al cotizador. */
export function SolicitudPagina({ tipoInicial, prestamo }: { tipoInicial: TipoSolicitud; prestamo: Prestamo }) {
  const [tipo, setTipo] = useState<TipoSolicitud>(tipoInicial);
  const volver = `/solicitar?${aQuery(tipo, prestamo)}#cotizador`;

  return (
    <div className="space-y-6">
      <Link href={volver} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand hover:underline">
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Volver al cotizador
      </Link>
      <SolicitudForm tipo={tipo} onTipo={setTipo} prestamo={prestamo} hrefCotizador={volver} />
    </div>
  );
}
