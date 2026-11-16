import { NextResponse } from "next/server";
import JSZip from "jszip";
import type { DocumentoContenido } from "@/lib/documento/tipos";
import type { ExportFormat } from "@/lib/types/legajo";
import { generateDocumentoDocx } from "./documentoDocx";
import { generateDocumentoPdf } from "./documentoPdf";

const MIME_BY_FORMAT: Record<"docx" | "pdf", string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

/** "Cintia Starkman" -> "Cintia_Starkman" (sin tildes ni símbolos, apto para nombre de archivo). */
export function slugify(value: string, porDefecto = "documento"): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || porDefecto
  );
}

/** Formatos válidos pedidos por el cliente (null si no pidió ninguno). */
export function formatosPedidos(valor: unknown): ("docx" | "pdf")[] | null {
  if (!Array.isArray(valor)) return null;
  const formatos = (valor as ExportFormat[]).filter((f): f is "docx" | "pdf" => f === "docx" || f === "pdf");
  return formatos.length > 0 ? formatos : null;
}

/** Genera el documento en los formatos pedidos: uno solo se descarga directo y varios, en un .zip. */
export async function responderDescarga(
  contenido: DocumentoContenido,
  formatos: ("docx" | "pdf")[],
  baseName: string
): Promise<NextResponse> {
  const generadores: Record<"docx" | "pdf", () => Promise<Buffer>> = {
    docx: () => generateDocumentoDocx(contenido),
    pdf: () => generateDocumentoPdf(contenido),
  };

  let cuerpo: Buffer;
  let contentType: string;
  let filename: string;

  if (formatos.length === 1) {
    const formato = formatos[0];
    cuerpo = await generadores[formato]();
    contentType = MIME_BY_FORMAT[formato];
    filename = `${baseName}.${formato}`;
  } else {
    const zip = new JSZip();
    for (const formato of formatos) {
      zip.file(`${baseName}.${formato}`, await generadores[formato]());
    }
    cuerpo = await zip.generateAsync({ type: "nodebuffer" });
    contentType = "application/zip";
    filename = `${baseName}.zip`;
  }

  return new NextResponse(new Uint8Array(cuerpo), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
