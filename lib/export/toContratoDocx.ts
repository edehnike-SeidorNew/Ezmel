import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle, ImageRun, Footer } from "docx";
import { LOGO_ASPECT, LOGO_PNG, LOGO_TAGLINE_ASPECT, LOGO_TAGLINE_PNG } from "@/lib/brand/logo";
import {
  buildContratoContenido,
  LINEA_DNI,
  LINEA_NOMBRE,
  type AnexoContenido,
  type FirmaBloque,
  type TextSegment,
} from "@/lib/contrato/buildContratoBlocks";
import type { ContratoDatos } from "@/lib/types/contrato";

export const PAGE_WIDTH = 12240;
export const CONTENT_WIDTH = PAGE_WIDTH - 2 * 1440;

/** Barra de sección azul marino con texto blanco, igual al estilo de la página. */
export function heading(text: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "1A5F6F" },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                keepNext: true,
                children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: "FFFFFF" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Título principal (CONTRATO DE MUTUO / PAGARÉ): barra azul marino centrada con texto blanco. */
export function titleBar(text: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "1A5F6F" },
            margins: { top: 140, bottom: 140, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 32, color: "FFFFFF" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Logo con el subtítulo "Servicios financieros" debajo, para el encabezado. */
export function logoTaglineRun(widthPx: number) {
  return new ImageRun({
    type: "png",
    data: LOGO_TAGLINE_PNG,
    transformation: { width: widthPx, height: Math.round(widthPx / LOGO_TAGLINE_ASPECT) },
  });
}

export function logoRun(widthPx: number) {
  return new ImageRun({
    type: "png",
    data: LOGO_PNG,
    transformation: { width: widthPx, height: Math.round(widthPx / LOGO_ASPECT) },
  });
}

export function spacer() {
  return new Paragraph({ spacing: { before: 150, after: 60 }, children: [] });
}

const DATO_SIZE = 22;

/** Datos completados: negro puro y un punto más grandes que el texto fijo. */
export function datoRun(text: string, saltoAntes = false) {
  return new TextRun({ text, bold: true, size: DATO_SIZE, color: "000000", break: saltoAntes ? 1 : undefined });
}

/** Los saltos de línea del texto pasan a saltos de línea del Word. */
export function segmentsToRuns(segments: TextSegment[], size = 20): TextRun[] {
  return segments.flatMap((s) =>
    s.text
      .split("\n")
      .map((parte, i) =>
        s.bold ? datoRun(parte, i > 0) : new TextRun({ text: parte, size, break: i > 0 ? 1 : undefined })
      )
  );
}

export function bodyText(segments: TextSegment[]) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100 },
    children: segmentsToRuns(segments),
  });
}

/** Anchos (DXA) de las 8 columnas del plan de pagos: N°, Vence, Saldo inicial, Amortización, Interés, IVA, Cuota, Saldo final. */
const ANCHO_COLUMNAS_ANEXO = [560, 1150, 1350, 1350, 1200, 1050, 1300, 1400];

const BORDE_ANEXO = { style: BorderStyle.SINGLE, size: 4, color: "C3DADB" };
const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

/** Celda de la tabla del ANEXO I: todo centrado; el encabezado va en blanco sobre fondo verde, como en el original. */
function celdaAnexo(texto: string, i: number, opciones: { encabezado?: boolean; negrita?: boolean } = {}) {
  return new TableCell({
    width: { size: ANCHO_COLUMNAS_ANEXO[i], type: WidthType.DXA },
    shading: opciones.encabezado ? { type: ShadingType.CLEAR, color: "auto", fill: "1A5F6F" } : undefined,
    margins: { top: 60, bottom: 60, left: 40, right: 40 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: texto,
            size: 16,
            bold: opciones.encabezado || opciones.negrita,
            color: opciones.encabezado ? "FFFFFF" : opciones.negrita ? "000000" : undefined,
          }),
        ],
      }),
    ],
  });
}

/** Bloques de firma de a dos por fila: línea arriba, rol en negrita y los datos debajo, centrados. */
export function firmasChildren(bloques: FirmaBloque[]): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const ancho = 4400;
  const hueco = CONTENT_WIDTH - 2 * ancho;
  const linea = { style: BorderStyle.SINGLE, size: 8, color: "000000" };

  for (let i = 0; i < bloques.length; i += 2) {
    const fila = bloques.slice(i, i + 2);
    const celdaFirma = (b: FirmaBloque | undefined) =>
      new TableCell({
        width: { size: ancho, type: WidthType.DXA },
        borders: { top: b ? linea : SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE },
        margins: { top: 60, bottom: 40, left: 60, right: 60 },
        children: b
          ? [
              new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new TextRun({ text: b.rol, bold: true, size: 20 })] }),
              ...b.lineas.map(
                (l) => new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: segmentsToRuns(l) })
              ),
            ]
          : [new Paragraph({ children: [] })],
      });
    const celdaHueco = new TableCell({
      width: { size: hueco, type: WidthType.DXA },
      borders: { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE },
      children: [new Paragraph({ children: [] })],
    });

    // El espacio arriba deja lugar para firmar sobre la línea; keepNext evita que el bloque se parta entre hojas.
    items.push(
      new Paragraph({ keepNext: true, spacing: { before: i === 0 ? 800 : 600 }, children: [] }),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [ancho, hueco, ancho],
        rows: [new TableRow({ cantSplit: true, children: [celdaFirma(fila[0]), celdaHueco, celdaFirma(fila[1])] })],
      })
    );
  }
  return items;
}

/** ANEXO I – Plan de pagos: título, datos del préstamo, tabla de cuotas y firmas. */
function anexoChildren(a: AnexoContenido): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [
    new Paragraph({ pageBreakBefore: true, children: [] }),
    titleBar(a.titulo),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 160 },
      children: segmentsToRuns(a.subtitulo),
    }),
  ];

  // Datos del préstamo en dos columnas, sin bordes (se leen de izquierda a derecha, de a dos).
  const mitad = CONTENT_WIDTH / 2;
  const filasResumen: TableRow[] = [];
  for (let i = 0; i < a.resumen.length; i += 2) {
    filasResumen.push(
      new TableRow({
        children: a.resumen.slice(i, i + 2).map(
          (r) =>
            new TableCell({
              width: { size: mitad, type: WidthType.DXA },
              borders: { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: `${r.etiqueta}: `, size: 20 }), ...segmentsToRuns(r.valor)] })],
            })
        ),
      })
    );
  }
  items.push(
    new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: [mitad, mitad], rows: filasResumen }),
    new Paragraph({
      spacing: { before: 120, after: 160 },
      children: [
        new TextRun({ text: `${a.cftea.etiqueta}: `, bold: true, size: 22, color: "1A5F6F" }),
        new TextRun({ text: a.cftea.valor, bold: true, size: 22, color: "000000" }),
      ],
    })
  );

  if (a.filas.length > 0) {
    const bordes = { top: BORDE_ANEXO, bottom: BORDE_ANEXO, left: BORDE_ANEXO, right: BORDE_ANEXO, insideHorizontal: BORDE_ANEXO, insideVertical: BORDE_ANEXO };
    items.push(
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: ANCHO_COLUMNAS_ANEXO,
        borders: bordes,
        rows: [
          new TableRow({ tableHeader: true, children: a.columnas.map((col, i) => celdaAnexo(col, i, { encabezado: true })) }),
          ...a.filas.map((fila) => new TableRow({ cantSplit: true, children: fila.map((v, i) => celdaAnexo(v, i, { negrita: i > 0 })) })),
          new TableRow({ cantSplit: true, children: a.totales.map((v, i) => celdaAnexo(v, i, { negrita: true })) }),
        ],
      })
    );
  }

  items.push(...firmasChildren(a.firmas));
  return items;
}

export async function generateContratoDocx(datos: ContratoDatos): Promise<Buffer> {
  const c = buildContratoContenido(datos);

  const children: (Paragraph | Table)[] = [
    titleBar(c.titulo),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, children: [logoTaglineRun(200)] }),
    spacer(),
    new Paragraph({ spacing: { after: 100 }, children: segmentsToRuns(c.numero) }),
    bodyText(c.intro),
  ];

  for (const clausula of c.clausulas) {
    children.push(spacer(), heading(clausula.titulo), spacer(), bodyText(clausula.texto));
  }

  children.push(spacer(), bodyText(c.cierre), ...firmasChildren(c.firmas));

  // ANEXO I (plan de pagos): en página nueva, entre el contrato y el pagaré.
  children.push(...anexoChildren(c.anexo));

  // Pagaré: en página nueva, con su propio título.
  children.push(
    new Paragraph({ pageBreakBefore: true, children: [] }),
    titleBar(c.pagare.titulo),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: c.pagare.subtitulo, size: 20 })],
    }),
    new Paragraph({ spacing: { after: 80 }, children: segmentsToRuns(c.pagare.encabezado) }),
    new Paragraph({ spacing: { after: 150 }, children: segmentsToRuns(c.pagare.por) }),
    bodyText(c.pagare.cuerpo),
    bodyText(c.pagare.valor),
    bodyText(c.pagare.lugarFecha),
    spacer(),
    new Paragraph({
      spacing: { before: 555 },
      children: [new TextRun({ text: `${c.pagare.firmanteLabel} ${LINEA_NOMBRE}`, bold: true, size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 555 },
      children: [new TextRun({ text: "Nombre y apellido: ", size: 20 }), datoRun(c.pagare.nombre || LINEA_NOMBRE)],
    }),
    new Paragraph({
      spacing: { before: 555 },
      children: [new TextRun({ text: "DNI N°: ", size: 20 }), datoRun(c.pagare.documento || LINEA_DNI)],
    }),
    new Paragraph({
      spacing: { before: 555 },
      children: [new TextRun({ text: "Domicilio: ", size: 20 }), datoRun(c.pagare.domicilio || LINEA_NOMBRE)],
    })
  );

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
