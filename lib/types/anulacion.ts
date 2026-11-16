/** Datos del convenio de anulación de un contrato de mutuo. Las fechas van como "AAAA-MM-DD" y los montos en pesos. */
export interface AnulacionDatos {
  /** Fecha en que se firma el convenio de anulación. */
  fechaConvenio: string;

  // Mutuario
  mutuarioNombre: string;
  mutuarioDni: string;
  mutuarioDomicilio: string;
  mutuarioEmail: string;

  // Contrato de mutuo que se anula
  fechaContratoOriginal: string;
  /** ID del sobre de firma electrónica (Docusign) del contrato original. Opcional. */
  docusignId: string;
  montoPrestado: number;
  montoADevolver: number;
  cantidadCuotas: number;
  /** Vencimiento de la (última) cuota y del pagaré. */
  fechaVencimiento: string;
}
