import type { FirmaBloque, TextSegment } from "@/lib/contrato/buildContratoBlocks";

/**
 * Documento de cláusulas genérico (refinanciación, anulación...). Cada documento arma su contenido con estos tipos
 * y la vista previa, el PDF y el Word lo dibujan igual, con el mismo formato que el contrato de mutuo.
 */

/** Un tramo del documento: con `titulo` va una barra de sección y debajo el texto; sin título es un párrafo suelto. */
export interface BloqueDocumento {
  titulo?: string;
  texto?: TextSegment[];
}

export interface FirmasDocumento {
  /**
   * "columnas": bloques de a dos con línea arriba y datos centrados (como el contrato de mutuo).
   * "lineas": lista vertical "Firma de ...: ______" con los datos debajo.
   */
  estilo: "columnas" | "lineas";
  /** Barra de título previa a las firmas (ej.: "FIRMAS"). Opcional. */
  titulo?: string;
  bloques: FirmaBloque[];
}

export interface DocumentoContenido {
  titulo: string;
  bloques: BloqueDocumento[];
  firmas: FirmasDocumento;
}

/** Línea para firmar en el estilo "lineas". */
export const LINEA_FIRMA = "_".repeat(28);
