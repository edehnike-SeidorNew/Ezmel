"use client";

import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { toEmbeddableImage } from "@/lib/export/prepareUpload";
import type { PdfFilesByCategory } from "@/lib/export/legajoPdfDocument";
import type { ArchivosPorCategoria } from "@/lib/legajo/payload";
import { pdfToPngPages } from "@/lib/pdf/pdfToPngPages";
import { isImageFile, isPdfFile } from "@/lib/types/legajo";
import type { SlotAdjunto } from "./adjuntos";
import { armarLegajo, hoyISO, type Prestamo, type SolicitudValores } from "./formulario";

export interface ResultadoPdf {
  blob: Blob;
  nombreArchivo: string;
  bytes: number;
}

function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error ?? new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(blob);
  });
}

function slug(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "cliente"
  );
}

/**
 * Arma, en el dispositivo del cliente, el PDF de la solicitud con el mismo formato que el legajo de la
 * plataforma. Nada se envía a ningún servidor: las fotos y los datos quedan en el PDF que el cliente descarga.
 */
export async function generarSolicitudPdf(entrada: {
  valores: SolicitudValores;
  prestamo: Prestamo;
  slots: SlotAdjunto[];
  archivos: Record<string, File[] | undefined>;
  onProgreso?: (mensaje: string) => void;
}): Promise<ResultadoPdf> {
  const { valores, prestamo, slots, archivos, onProgreso } = entrada;
  const hoy = hoyISO();
  const { legajo, solicitud } = armarLegajo(valores, prestamo, hoy);

  const files: PdfFilesByCategory = {};
  const nombres: ArchivosPorCategoria = {};

  for (const slot of slots) {
    const imagenes: { blob: Blob; width: number; height: number }[] = [];

    for (const file of archivos[slot.key] ?? []) {
      onProgreso?.(`Preparando: ${slot.label}…`);
      if (isPdfFile(file)) {
        for (const pagina of await pdfToPngPages(file)) {
          imagenes.push({ blob: pagina.blob, width: pagina.width, height: pagina.height });
        }
      } else if (isImageFile(file)) {
        imagenes.push(await toEmbeddableImage(file));
      }
    }

    for (const [i, imagen] of imagenes.entries()) {
      const caption = imagenes.length > 1 ? `${slot.label} (${i + 1}/${imagenes.length})` : slot.label;
      (files[slot.categoria] ??= []).push({
        caption,
        type: "image/jpeg",
        width: imagen.width,
        height: imagen.height,
        src: await blobADataUrl(imagen.blob),
      });
      (nombres[slot.categoria] ??= []).push(caption);
    }
  }

  onProgreso?.("Armando el PDF…");
  // El generador de PDF es pesado: se carga recién ahora, cuando hace falta.
  const [{ pdf }, { LegajoPdfDocument }, { buildLegajoPdfMetadata }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/export/legajoPdfDocument"),
    import("@/lib/legajo/payload"),
  ]);

  const origen = window.location.origin;
  const documento = createElement(LegajoPdfDocument, {
    data: legajo,
    files,
    assets: { logo: `${origen}/logo.png`, logoTagline: `${origen}/logo-tagline.png` },
    subtitle: "Solicitud enviada por el cliente: pendiente de validación",
    metadata: buildLegajoPdfMetadata({ data: legajo, files: nombres, origen: "solicitud-web", solicitud }),
  }) as unknown as ReactElement<DocumentProps>;

  const blob = await pdf(documento).toBlob();
  return {
    blob,
    nombreArchivo: `Solicitud_${slug(`${valores.nombre} ${valores.apellido}`)}.pdf`,
    bytes: blob.size,
  };
}
