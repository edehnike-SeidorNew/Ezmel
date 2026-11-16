"use client";

import { useState } from "react";
import { FolderIcon, UploadIcon } from "@/components/layout/icons";
import { PanelOpciones } from "@/components/layout/PanelOpciones";
import { CargarLegajo } from "./CargarLegajo";
import { LegajoWizard } from "./LegajoWizard";

const OPCIONES = [
  { id: "crear", label: "Crear legajo", titulo: "Crear legajo", Icon: FolderIcon },
  { id: "cargar", label: "Cargar legajo", titulo: "Cargar legajo", Icon: UploadIcon },
] as const;

type OpcionId = (typeof OPCIONES)[number]["id"];

/** Contenido del legajo + panel de opciones a la derecha (arriba en pantallas chicas). */
export function LegajosPanel() {
  const [opcion, setOpcion] = useState<OpcionId>("crear");
  const actual = OPCIONES.find((o) => o.id === opcion) ?? OPCIONES[0];

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      {/* Se baja la columna para que arranque a la altura del primer bloque (después del título y, en "crear", de los pasos). */}
      <PanelOpciones
        titulo="Legajos"
        opciones={OPCIONES}
        seleccion={opcion}
        onSelect={setOpcion}
        desplazamiento={opcion === "crear" ? "xl:mt-[6.75rem]" : "xl:mt-14"}
      />

      <div className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-bold text-brand">{actual.titulo}</h1>
        {/* El wizard queda montado para no perder lo cargado al cambiar de opción. */}
        <div hidden={opcion !== "crear"}>
          <LegajoWizard />
        </div>
        {opcion === "cargar" && <CargarLegajo />}
      </div>
    </div>
  );
}
