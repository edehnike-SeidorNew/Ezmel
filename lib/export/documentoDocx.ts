import { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, type Table } from "docx";
import { LINEA_FIRMA, type DocumentoContenido } from "@/lib/documento/tipos";
import {
  PAGE_WIDTH,
  bodyText,
  firmasChildren,
  heading,
  logoRun,
  logoTaglineRun,
  segmentsToRuns,
  spacer,
  titleBar,
} from "./toContratoDocx";

/** Word de un documento de cláusulas, con el mismo formato que el contrato de mutuo. */
export async function generateDocumentoDocx(c: DocumentoContenido): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    titleBar(c.titulo),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, children: [logoTaglineRun(200)] }),
    spacer(),
  ];

  // Con firmas en columnas, el párrafo de cierre viaja junto a ellas (keepNext): las firmas no quedan solas en una hoja.
  const ultimo = c.bloques[c.bloques.length - 1];
  const cierre = c.firmas.estilo === "columnas" && ultimo && !ultimo.titulo ? ultimo : null;

  for (const b of cierre ? c.bloques.slice(0, -1) : c.bloques) {
    if (b.titulo) {
      children.push(spacer(), heading(b.titulo));
      if (b.texto) children.push(spacer(), bodyText(b.texto));
    } else {
      children.push(bodyText(b.texto ?? []));
    }
  }

  if (c.firmas.estilo === "columnas") {
    if (cierre) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          keepNext: true,
          spacing: { before: 200, after: 100 },
          children: segmentsToRuns(cierre.texto ?? []),
        })
      );
    }
    children.push(...firmasChildren(c.firmas.bloques));
  } else {
    children.push(spacer());
    if (c.firmas.titulo) children.push(heading(c.firmas.titulo));
    // keepNext encadena el bloque de firmas para que no se parta entre hojas.
    for (const [i, f] of c.firmas.bloques.entries()) {
      children.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: i === 0 ? 550 : 150 },
          children: [new TextRun({ text: `${f.rol}: ${LINEA_FIRMA}`, bold: true, size: 20 })],
        })
      );
      f.lineas.forEach((linea, j) =>
        children.push(
          new Paragraph({
            keepNext: i < c.firmas.bloques.length - 1 || j < f.lineas.length - 1,
            spacing: { before: 200, after: j === f.lineas.length - 1 ? 250 : 0 },
            children: segmentsToRuns(linea),
          })
        )
      );
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial" } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_WIDTH, height: 15840 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [logoRun(90)] }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "SERVICIOS FINANCIEROS", size: 11, color: "1B4558", characterSpacing: 24 })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
