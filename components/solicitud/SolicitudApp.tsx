"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Prestamo } from "@/lib/solicitud/formulario";
import { aQuery } from "@/lib/solicitud/parametros";
import type { TipoSolicitud } from "@/lib/solicitud/requisitos";
import { CotizadorCarga } from "./CotizadorCarga";
import { Requisitos } from "./Requisitos";

/**
 * Requisitos y cotizador comparten lo elegido: el tipo (Personal / Comercial) y el plan cotizado.
 * El formulario está en otra página: al pedir el préstamo, el tipo y el plan viajan en la URL.
 */
export function SolicitudApp({
  tipoInicial,
  prestamoInicial,
}: {
  tipoInicial: TipoSolicitud;
  prestamoInicial: Prestamo;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoSolicitud>(tipoInicial);
  const [prestamo, setPrestamo] = useState<Prestamo>(prestamoInicial);

  function irAlFormulario() {
    router.push(`/solicitar/formulario?${aQuery(tipo, prestamo)}`);
  }

  return (
    <>
      <Requisitos tipo={tipo} onTipo={setTipo} />
      <CotizadorCarga prestamo={prestamo} onChange={setPrestamo} onSolicitar={irAlFormulario} />
    </>
  );
}
