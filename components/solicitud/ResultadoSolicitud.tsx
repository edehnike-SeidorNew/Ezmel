"use client";

import { useState } from "react";
import { MUTUANTE_INFO } from "@/lib/data/contratoFijo";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";

/** Número de WhatsApp de EzMel: "11 6873-5180" -> "5491168735180". */
const WHATSAPP = `549${MUTUANTE_INFO.telefono.replace(/\D/g, "")}`;
const MENSAJE = "Hola, te envío mi solicitud de préstamo. Adjunto el PDF.";

/** Descarga un archivo en el dispositivo, igual que el botón "Descargar PDF". */
export function descargarArchivo(archivo: File) {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera un rato después: algunos navegadores todavía están leyendo el archivo.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function IconoWhatsApp() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.08.9.92-3-.2-.31A8.2 8.2 0 1 1 12.04 20.1Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.47c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.54.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

/** Pantalla final: el PDF ya se descargó; el cliente lo manda por WhatsApp. Nada se guardó en ningún servidor. */
export function ResultadoSolicitud({ archivo, onEditar }: { archivo: File; onEditar: () => void }) {
  const url = useObjectUrl(archivo);
  const [aviso, setAviso] = useState<string | null>(null);

  // En el celular se puede mandar el archivo directo desde el menú de compartir (el cliente elige el chat).
  const puedeCompartir =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [archivo] });

  async function compartir() {
    setAviso(null);
    try {
      await navigator.share({ files: [archivo], title: "Solicitud de préstamo", text: MENSAJE });
    } catch (error) {
      // Si la persona cierra el menú no es un error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAviso("No se pudo abrir el menú para compartir. Descargá el PDF y mandalo por WhatsApp.");
    }
  }

  const mb = archivo.size / (1024 * 1024);

  return (
    <div className="space-y-5 rounded-2xl border border-emerald-300 bg-white p-6" role="status">
      <div className="flex items-start gap-3">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-8 w-8 shrink-0 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m7.5 12.5 3 3 6-6.5" />
        </svg>
        <div>
          <h3 className="text-xl font-bold text-brand">¡Tu solicitud está lista!</h3>
          <p className="mt-1 text-sm text-slate-700">
            Tu PDF está listo. Mandanoslo por WhatsApp para que sigamos con la evaluación.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-slate-800">
        <p className="break-all font-semibold">{archivo.name}</p>
        <p className="text-xs text-slate-600">{mb < 0.1 ? "menos de 0,1" : mb.toFixed(1).replace(".", ",")} MB</p>
      </div>

      <div className="flex flex-col gap-3">
        {puedeCompartir && (
          <button
            type="button"
            onClick={compartir}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-brand-hover"
          >
            <IconoWhatsApp />
            Enviar por WhatsApp
          </button>
        )}

        <a
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-semibold ${
            puedeCompartir
              ? "border border-brand-border bg-white text-brand hover:bg-brand-soft"
              : "bg-brand text-white shadow-md hover:bg-brand-hover"
          }`}
        >
          <IconoWhatsApp />
          <span className="text-center leading-tight">
            Abrir chat de EzMel
            <span className="block whitespace-nowrap text-xs font-normal opacity-90">{MUTUANTE_INFO.telefono}</span>
          </span>
        </a>

        {url && (
          <a
            href={url}
            download={archivo.name}
            className="flex items-center justify-center rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            Descargar el PDF de nuevo
          </a>
        )}
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
        {puedeCompartir ? (
          <>
            <li>Tocá “Enviar por WhatsApp” y elegí el chat de EzMel ({MUTUANTE_INFO.telefono}).</li>
            <li>O abrí el chat con el segundo botón y adjuntá el PDF con el clip (Documento).</li>
          </>
        ) : (
          <>
            <li>Tocá “Abrir chat de EzMel”.</li>
            <li>Adjuntá el PDF con el clip (Documento) y elegí {archivo.name}.</li>
          </>
        )}
        <li>Enviá el mensaje: nosotros seguimos desde ahí.</li>
      </ol>

      {aviso && (
        <p role="alert" className="text-sm text-red-600">
          {aviso}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Tus datos y tus fotos no se guardan en esta página: quedaron solamente en este PDF, que se armó en tu
        dispositivo.
      </p>

      <button type="button" onClick={onEditar} className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline-offset-2 hover:underline">
        Corregir algo de mi solicitud
      </button>
    </div>
  );
}
