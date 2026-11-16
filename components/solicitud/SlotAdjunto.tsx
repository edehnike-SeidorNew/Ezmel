"use client";

import { useRef, useState } from "react";
import { FotoNoLegibleError, toEmbeddableImage } from "@/lib/export/prepareUpload";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { MAX_BYTES_ARCHIVO, type SlotAdjunto as Slot } from "@/lib/solicitud/adjuntos";
import { ACCEPTED_FILE_ACCEPT, isImageFile, isPdfFile } from "@/lib/types/legajo";

function Miniatura({ file, onQuitar }: { file: File; onQuitar: () => void }) {
  const esImagen = isImageFile(file);
  const url = useObjectUrl(file, esImagen);

  return (
    <li className="relative w-20 shrink-0">
      {esImagen && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="h-20 w-20 rounded-lg border border-brand-border object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-brand-border bg-brand-soft text-xs font-bold text-brand">
          {esImagen ? "…" : "PDF"}
        </div>
      )}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${file.name}`}
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm font-bold leading-none text-white shadow"
      >
        ×
      </button>
    </li>
  );
}

const botonClass =
  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors";

/**
 * Un documento a adjuntar. En el celular "Sacar foto" abre la cámara (la trasera para documentos, la
 * frontal para la selfie) y "Elegir archivo" abre la galería o los archivos.
 */
export function SlotAdjunto({
  slot,
  archivos,
  onChange,
}: {
  slot: Slot;
  archivos: File[];
  onChange: (archivos: File[]) => void;
}) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const completo = archivos.length >= slot.min;
  const lleno = archivos.length >= slot.max;

  async function agregar(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    // Se copia acá: el input se vacía enseguida y la FileList queda vacía.
    const nuevos = Array.from(lista);
    const validos: File[] = [];
    let aviso: string | null = null;

    for (const file of nuevos) {
      const tipoOk = isImageFile(file) || (!slot.soloImagen && isPdfFile(file));
      if (!tipoOk) {
        aviso = slot.soloImagen ? "Para este documento hace falta una foto." : "Solo se aceptan fotos o PDF.";
      } else if (file.size > MAX_BYTES_ARCHIVO) {
        aviso = "Un archivo pesa demasiado (máximo 30 MB). Probá con otra foto.";
      } else if (isImageFile(file)) {
        // La foto se achica y se pasa a JPEG apenas se elige: así se detecta enseguida si no se puede leer
        // (en vez de enterarse recién al armar el PDF) y no se guardan en memoria fotos de varios megapíxeles.
        setProcesando(true);
        try {
          const { blob } = await toEmbeddableImage(file);
          const nombre = file.name.replace(/\.[^./\\]+$/, "") || "foto";
          validos.push(new File([blob], `${nombre}.jpg`, { type: "image/jpeg", lastModified: file.lastModified }));
        } catch (error) {
          aviso = error instanceof FotoNoLegibleError ? error.message : "No pudimos procesar esta foto. Sacala de nuevo o elegí otra.";
        } finally {
          setProcesando(false);
        }
      } else {
        validos.push(file);
      }
    }

    // Con un solo archivo permitido, la foto nueva reemplaza a la anterior (para repetirla si salió mal).
    let resultado = slot.max === 1 ? validos.slice(0, 1) : [...archivos, ...validos];
    if (slot.max === 1 && validos.length === 0) resultado = archivos;
    if (resultado.length > slot.max) {
      resultado = resultado.slice(0, slot.max);
      aviso = `Podés adjuntar hasta ${slot.max} archivos.`;
    }

    setAviso(aviso);
    onChange(resultado);
  }

  return (
    <section
      data-slot={slot.key}
      className={`rounded-xl border p-4 ${completo ? "border-emerald-300 bg-emerald-50/40" : "border-brand-border bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{slot.label}</h4>
          {slot.ayuda && <p className="mt-0.5 text-xs text-slate-600">{slot.ayuda}</p>}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            completo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {completo ? "Listo" : slot.min > 1 ? `${archivos.length} de ${slot.min}` : "Falta"}
        </span>
      </div>

      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture={slot.camara}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galeria}
        type="file"
        accept={slot.soloImagen ? "image/*" : ACCEPTED_FILE_ACCEPT}
        multiple={slot.max > 1}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => camara.current?.click()}
          disabled={(lleno && slot.max > 1) || procesando}
          className={`${botonClass} bg-brand text-white hover:bg-brand-hover disabled:opacity-50`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {procesando ? "Procesando…" : archivos.length > 0 && slot.max === 1 ? "Repetir foto" : "Sacar foto"}
        </button>
        <button
          type="button"
          onClick={() => galeria.current?.click()}
          disabled={(lleno && slot.max > 1) || procesando}
          className={`${botonClass} border border-brand-border bg-white text-brand hover:bg-brand-soft disabled:opacity-50`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          {slot.soloImagen ? "Elegir de la galería" : "Elegir archivo"}
        </button>
      </div>

      {aviso && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {aviso}
        </p>
      )}

      {archivos.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-3">
          {archivos.map((file, i) => (
            <Miniatura
              key={`${file.name}-${file.lastModified}-${i}`}
              file={file}
              onQuitar={() => {
                setAviso(null);
                onChange(archivos.filter((_, j) => j !== i));
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
