"use client";

import { FILE_CATEGORIES, isImageFile, isPdfFile } from "@/lib/types/legajo";
import type { LegajoFileCategoryKey } from "@/lib/types/legajo";
import { pdfToPngPages } from "@/lib/pdf/pdfToPngPages";
import type { AttachmentMeta } from "./common";

// Netlify Functions corta el request en 6MB (límite fijo de la plataforma,
// no configurable). Recomprimimos todo bien por debajo de eso.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/** La foto no se pudo leer o procesar: el mensaje ya está pensado para mostrárselo a quien la subió. */
export class FotoNoLegibleError extends Error {
  constructor(
    mensaje: string,
    readonly nombreArchivo: string
  ) {
    super(mensaje);
    this.name = "FotoNoLegibleError";
  }
}

const esHeic = (file: { name: string; type: string }) => /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

function mensajeNoLegible(file: File): string {
  return esHeic(file)
    ? "Esta foto está en formato HEIC y el navegador no la puede leer. Sacala de nuevo con «Sacar foto» (o, en el iPhone, elegí Ajustes → Cámara → Formatos → «Más compatible»)."
    : "No pudimos leer esta foto. Sacala de nuevo o elegí otra.";
}

/** Tamaño real de la imagen (ya con la orientación del celular aplicada), sin decodificarla entera. */
function leerDimensiones(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve({ width: el.naturalWidth, height: el.naturalHeight });
    el.onerror = () => reject(new Error("imagen ilegible"));
    el.src = url;
  });
}

/**
 * Dibuja la imagen achicada. Primero intenta que el navegador la decodifique ya en el tamaño final
 * (`createImageBitmap` con resize): las fotos de celular de 12 a 50 megapíxeles ocupan cientos de MB
 * si se decodifican enteras y en celulares con poca memoria eso hace fallar todo. Si no está disponible
 * o falla, se usa el camino clásico con <img>.
 */
async function dibujarAchicada(file: File, url: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  // Fondo blanco: PNG con transparencia se vería negro al pasar a JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
        imageOrientation: "from-image",
      });
      try {
        ctx.drawImage(bitmap, 0, 0, width, height);
        return canvas;
      } finally {
        bitmap.close();
      }
    } catch {
      /* se prueba con <img> */
    }
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("imagen ilegible"));
    el.src = url;
  });
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Reencoda cualquier imagen a JPEG, achicada si hace falta. Las fotos de
 * celular pueden pesar varios MB aun siendo JPEG; sin esto, dos o tres fotos
 * ya alcanzan el límite de la función. Si la foto no se puede leer lanza `FotoNoLegibleError`.
 */
export async function toEmbeddableImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  let canvas: HTMLCanvasElement | null = null;
  try {
    const natural = await leerDimensiones(url).catch(() => {
      throw new FotoNoLegibleError(mensajeNoLegible(file), file.name);
    });
    if (!natural.width || !natural.height) throw new FotoNoLegibleError(mensajeNoLegible(file), file.name);

    const scale = Math.min(MAX_DIMENSION / natural.width, MAX_DIMENSION / natural.height, 1);
    const width = Math.max(1, Math.round(natural.width * scale));
    const height = Math.max(1, Math.round(natural.height * scale));

    try {
      canvas = await dibujarAchicada(file, url, width, height);
    } catch {
      throw new FotoNoLegibleError(mensajeNoLegible(file), file.name);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) {
      throw new FotoNoLegibleError(
        "El celular no tiene memoria suficiente para procesar esta foto. Cerrá otras aplicaciones o sacala de nuevo con menor calidad.",
        file.name
      );
    }

    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
    if (canvas) {
      // Libera la memoria del lienzo enseguida (importante en el celular cuando se procesan varias fotos).
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export interface PreparedUpload {
  meta: AttachmentMeta[];
  /** Archivos en el mismo orden que `meta`, ya listos para el FormData. */
  blobs: { category: LegajoFileCategoryKey; blob: Blob; filename: string }[];
  totalBytes: number;
}

/**
 * Deja todos los adjuntos como imágenes JPEG livianas antes de mandarlos al
 * servidor: las imágenes se recomprimen, y cada PDF se expande a una imagen
 * por página. Así el servidor no necesita rasterizar nada.
 */
export async function prepareUpload(
  files: Partial<Record<LegajoFileCategoryKey, File[]>>
): Promise<PreparedUpload> {
  const meta: AttachmentMeta[] = [];
  const blobs: PreparedUpload["blobs"] = [];

  for (const category of FILE_CATEGORIES) {
    for (const file of files[category.key] ?? []) {
      if (isPdfFile(file)) {
        const pages = await pdfToPngPages(file);
        for (const page of pages) {
          meta.push({
            category: category.key,
            caption:
              page.totalPages > 1
                ? `${file.name} — página ${page.pageNumber}/${page.totalPages}`
                : file.name,
            width: page.width,
            height: page.height,
          });
          blobs.push({
            category: category.key,
            blob: page.blob,
            filename: `${file.name}-p${page.pageNumber}.jpg`,
          });
        }
      } else if (isImageFile(file)) {
        const normalizado = await toEmbeddableImage(file);
        meta.push({
          category: category.key,
          caption: file.name,
          width: normalizado.width,
          height: normalizado.height,
        });
        blobs.push({ category: category.key, blob: normalizado.blob, filename: file.name });
      }
    }
  }

  const totalBytes = blobs.reduce((sum, b) => sum + b.blob.size, 0);
  return { meta, blobs, totalBytes };
}
