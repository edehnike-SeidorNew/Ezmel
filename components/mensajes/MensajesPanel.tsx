"use client";

import { useState } from "react";
import { CardLateral } from "@/components/layout/CardLateral";
import { MessageIcon } from "@/components/layout/icons";
import { PanelOpciones } from "@/components/layout/PanelOpciones";
import type { Cotizacion } from "@/lib/cotizador/calcular";
import { CotizacionWhatsApp } from "./CotizacionWhatsApp";
import { TablaCronograma } from "./TablaCronograma";

// Lista de mensajes predeterminados. Para sumar otro: una entrada acá y su bloque en el contenido.
const MENSAJES = [{ id: "prestamo", label: "Préstamo", titulo: "Mensaje de préstamo", Icon: MessageIcon }] as const;

type MensajeId = (typeof MENSAJES)[number]["id"];

/** Mensajes predeterminados para enviar por WhatsApp + lista de mensajes a la derecha (arriba en pantallas chicas). */
export function MensajesPanel() {
  const [mensaje, setMensaje] = useState<MensajeId>("prestamo");
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const actual = MENSAJES.find((m) => m.id === mensaje) ?? MENSAJES[0];

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      {/* `fija={false}`: el cronograma puede ser largo y la columna no tiene que quedar cortada al scrollear. */}
      <PanelOpciones
        titulo="Mensajes"
        opciones={MENSAJES}
        seleccion={mensaje}
        onSelect={setMensaje}
        desplazamiento="xl:mt-14"
        fija={false}
      >
        {/* Sólo en pantallas anchas; en las chicas el cronograma va dentro del contenido, debajo del resultado. */}
        {mensaje === "prestamo" && cotizacion && (
          <div className="hidden xl:block">
            <CardLateral titulo="Cronograma de pagos">
              <TablaCronograma cronograma={cotizacion.cronograma} />
            </CardLateral>
          </div>
        )}
      </PanelOpciones>

      <div className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-bold text-brand">{actual.titulo}</h1>
        {mensaje === "prestamo" && <CotizacionWhatsApp onCotizacion={setCotizacion} />}
      </div>
    </div>
  );
}
