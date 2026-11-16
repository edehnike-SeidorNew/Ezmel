"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/layout/icons";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { isPdfFile } from "@/lib/types/legajo";
import { PdfPagesPreview } from "./PdfPagesPreview";

/** Imagen a pantalla completa: ajustada a la ventana, y con un clic se ve a tamaño real (con scroll). */
function ImagenGrande({ file }: { file: File }) {
  const url = useObjectUrl(file, true);
  const [real, setReal] = useState(false);

  if (!url) return <p className="text-sm text-white/80">Abriendo…</p>;
  return (
    <div className="flex max-h-full max-w-full items-center justify-center overflow-auto rounded-md bg-black/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={file.name}
        onClick={() => setReal((r) => !r)}
        className={real ? "max-w-none cursor-zoom-out" : "max-h-[78vh] max-w-full cursor-zoom-in object-contain"}
      />
    </div>
  );
}

/**
 * Visor de adjuntos para verificarlos: se abre sobre la pantalla, con el archivo grande, flechas para pasar al
 * anterior o al siguiente de la misma categoría, y se cierra con la X, tocando afuera o con Esc.
 * Las imágenes se ajustan a la ventana (un clic las muestra a tamaño real) y los PDF con todas sus páginas.
 */
export function VisorAdjuntos({
  files,
  indice,
  onCambiar,
  onCerrar,
}: {
  files: File[];
  indice: number;
  onCambiar: (i: number) => void;
  onCerrar: () => void;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const file = files[indice];
  const total = files.length;

  // Teclado y bloqueo del scroll de la página de atrás mientras está abierto.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowLeft" && indice > 0) onCambiar(indice - 1);
      else if (e.key === "ArrowRight" && indice < total - 1) onCambiar(indice + 1);
    };
    window.addEventListener("keydown", alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [indice, total, onCambiar, onCerrar]);

  if (!file) return null;
  const esPdf = isPdfFile(file);

  const flecha = "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Adjunto ${file.name}`}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/92 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-white/70">
            {indice + 1} de {total}
            {!esPdf && " · tocá la imagen para verla a tamaño real"}
          </p>
        </div>
        <button
          ref={cerrarRef}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <CloseIcon />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCerrar();
        }}
      >
        {indice > 0 && (
          <button type="button" aria-label="Anterior" onClick={() => onCambiar(indice - 1)} className={`${flecha} left-1`}>
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        )}

        {esPdf ? (
          <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-md bg-white p-3">
            <PdfPagesPreview file={file} />
          </div>
        ) : (
          <ImagenGrande key={`${file.name}-${file.lastModified}-${indice}`} file={file} />
        )}

        {indice < total - 1 && (
          <button type="button" aria-label="Siguiente" onClick={() => onCambiar(indice + 1)} className={`${flecha} right-1`}>
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
