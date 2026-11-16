"use client";

import { loadPdfjs } from "@/lib/pdf/pdfToPngPages";
import { FILE_CATEGORIES } from "@/lib/types/legajo";
import type { LegajoFileCategoryKey, LegajoFormValues } from "@/lib/types/legajo";
import { decodeLegajoPayload, parseLegajoPayload, type LegajoPayload } from "./payload";

/** Máximo que se acepta abrir: un legajo con muchas fotos pesa unos pocos MB. */
export const MAX_BYTES_LEGAJO_PDF = 40 * 1024 * 1024;

/** El archivo no se puede usar como legajo (el mensaje es apto para mostrárselo al usuario). */
export class PdfNoValidoError extends Error {}

export interface LegajoLeido {
  payload: LegajoPayload;
  /** Valores ya validados, listos para completar el formulario. */
  valores: Partial<LegajoFormValues>;
  /** Documentos del legajo, una imagen por archivo, recuperados de las hojas del PDF. */
  archivos: Partial<Record<LegajoFileCategoryKey, File[]>>;
  /** Campos con un valor inválido que se descartaron. */
  descartados: string[];
  advertencias: string[];
  paginas: number;
}

type Pdfjs = Awaited<ReturnType<typeof loadPdfjs>>;
type Doc = Awaited<ReturnType<Pdfjs["getDocument"]>["promise"]>;
type Page = Awaited<ReturnType<Doc["getPage"]>>;

const sinEspacios = (texto: string) => texto.replace(/\s+/g, "").toLowerCase();

async function textoDePagina(page: Page): Promise<string> {
  const contenido = await page.getTextContent();
  return sinEspacios(contenido.items.map((item) => ("str" in item ? item.str : "")).join(" "));
}

interface ImagenPdf {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8ClampedArray | Uint8Array;
  bitmap?: ImageBitmap;
}

function objetoDePagina(page: Page, id: string): Promise<ImagenPdf | null> {
  return new Promise((resolve) => {
    const espera = setTimeout(() => resolve(null), 8000);
    try {
      const almacen = id.startsWith("g_") ? page.commonObjs : page.objs;
      almacen.get(id, (obj: unknown) => {
        clearTimeout(espera);
        resolve((obj as ImagenPdf) ?? null);
      });
    } catch {
      clearTimeout(espera);
      resolve(null);
    }
  });
}

function blobDeCanvas(canvas: HTMLCanvasElement, calidad = 0.9): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
}

/** La imagen incrustada en el PDF pasada a un canvas (JPEG con fondo blanco). */
async function imagenACanvas(img: ImagenPdf): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, img.width, img.height);

  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
    return canvas;
  }
  if (!img.data) return null;

  const pixeles = img.width * img.height;
  const rgba = new Uint8ClampedArray(pixeles * 4);
  if (img.kind === 3) {
    rgba.set(img.data.subarray(0, pixeles * 4));
  } else if (img.kind === 2) {
    for (let i = 0, j = 0; i < pixeles; i++, j += 3) {
      rgba[i * 4] = img.data[j];
      rgba[i * 4 + 1] = img.data[j + 1];
      rgba[i * 4 + 2] = img.data[j + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else {
    return null;
  }
  ctx.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
  return canvas;
}

/** Foto principal de la hoja: la imagen más grande (los logos del pie son más chicos que 150 px de alto). */
async function fotoDeHoja(pdfjs: Pdfjs, page: Page): Promise<Blob | null> {
  const ops = await page.getOperatorList();
  let mejor: ImagenPdf | null = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== pdfjs.OPS.paintImageXObject) continue;
    const obj = await objetoDePagina(page, ops.argsArray[i][0] as string);
    if (!obj || Math.min(obj.width, obj.height) < 150) continue;
    if (!mejor || obj.width * obj.height > mejor.width * mejor.height) mejor = obj;
  }
  if (!mejor) return null;
  const canvas = await imagenACanvas(mejor);
  return canvas ? blobDeCanvas(canvas) : null;
}

/** Si no se puede sacar la foto sola, la hoja entera como imagen. */
async function hojaComoImagen(page: Page): Promise<Blob | null> {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, canvas, viewport, intent: "print" }).promise;
  return blobDeCanvas(canvas, 0.85);
}

function nombreArchivo(leyenda: string, indice: number): string {
  const base = leyenda
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${base || "adjunto"}-${indice + 1}.jpg`;
}

/**
 * Lee un PDF de legajo de EzMel: toma los datos incrustados y recupera los documentos adjuntos de sus hojas.
 * Todo pasa en el navegador. Lo que trae el PDF no es confiable (lo pudo generar el celular de cualquiera):
 * se valida y el administrativo lo revisa antes de guardar.
 */
export async function leerLegajoPdf(file: File, onProgreso?: (mensaje: string) => void): Promise<LegajoLeido> {
  if (file.size > MAX_BYTES_LEGAJO_PDF) throw new PdfNoValidoError("El PDF pesa demasiado (máximo 40 MB).");

  const pdfjs = await loadPdfjs();
  let doc: Doc;
  try {
    doc = await pdfjs.getDocument({
      data: await file.arrayBuffer(),
      standardFontDataUrl: "/pdfjs/standard_fonts/",
      cMapUrl: "/pdfjs/cmaps/",
      cMapPacked: true,
    }).promise;
  } catch {
    throw new PdfNoValidoError("No se pudo abrir el archivo. Elegí un PDF de legajo.");
  }

  onProgreso?.("Leyendo los datos…");
  const meta = await doc.getMetadata();
  const keywords = (meta.info as Record<string, unknown>)?.Keywords;
  const leido = parseLegajoPayload(decodeLegajoPayload(typeof keywords === "string" ? keywords : null));
  if (!leido) {
    throw new PdfNoValidoError(
      "Este PDF no trae los datos del legajo. Solo se pueden cargar PDF generados por EzMel (el legajo de la plataforma o la solicitud del cliente)."
    );
  }

  const advertencias: string[] = [];
  const archivos: Partial<Record<LegajoFileCategoryKey, File[]>> = {};
  const esperados: { categoria: LegajoFileCategoryKey; leyenda: string }[] = [];
  for (const categoria of FILE_CATEGORIES) {
    for (const leyenda of leido.payload.archivos[categoria.key] ?? []) {
      esperados.push({ categoria: categoria.key, leyenda });
    }
  }

  if (esperados.length > 0) {
    onProgreso?.("Recuperando los documentos…");
    const textos: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) textos.push(await textoDePagina(await doc.getPage(n)));

    // Cada documento está en su hoja, con su leyenda debajo: se buscan en orden.
    let cursor = 1;
    for (const [i, esperado] of esperados.entries()) {
      const buscada = sinEspacios(esperado.leyenda);
      let hoja = -1;
      for (let n = cursor; n < textos.length; n++) {
        if (textos[n].includes(buscada)) {
          hoja = n;
          break;
        }
      }
      if (hoja < 0) {
        advertencias.push(
          "No se pudieron recuperar todos los documentos del PDF. Los que falten hay que adjuntarlos a mano en el paso de documentación."
        );
        break;
      }
      cursor = hoja + 1;

      const page = await doc.getPage(hoja + 1);
      const blob = (await fotoDeHoja(pdfjs, page)) ?? (await hojaComoImagen(page));
      if (!blob) {
        advertencias.push(`No se pudo recuperar “${esperado.leyenda}”: adjuntalo a mano.`);
        continue;
      }
      (archivos[esperado.categoria] ??= []).push(
        new File([blob], nombreArchivo(esperado.leyenda, i), { type: "image/jpeg" })
      );
    }
  }

  return {
    payload: leido.payload,
    valores: leido.payload.data,
    archivos,
    descartados: leido.descartados,
    advertencias,
    paginas: doc.numPages,
  };
}
