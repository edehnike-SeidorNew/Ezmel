/** Requisitos para solicitar un préstamo, según el tipo de solicitante. Textos tal como se le informan al cliente. */
export type TipoSolicitud = "personal" | "comercial";

export interface GrupoRequisitos {
  titulo: string;
  items: string[];
}

export interface RequisitosTipo {
  titulo: string;
  grupos: GrupoRequisitos[];
  /** Avisos que van debajo de los requisitos. */
  avisos: { titulo: string; texto: string }[];
  cierre: string;
}

export const TIPOS: { id: TipoSolicitud; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "comercial", label: "Comercial" },
];

export const REQUISITOS: Record<TipoSolicitud, RequisitosTipo> = {
  personal: {
    titulo: "Requisitos para solicitar un préstamo",
    grupos: [
      {
        titulo: "Trabajadores en blanco",
        items: [
          "Últimos 3 recibos de sueldo.",
          "DNI (frente y dorso) y selfie con DNI en mano.",
          "Comprobante de domicilio (factura de luz, agua, gas u otro servicio).",
          "2 referencias personales mayores de 18 años (nombre, apellido, teléfono y DNI).",
        ],
      },
      {
        titulo: "Monotributistas",
        items: [
          "Constancia de inscripción al Monotributo actualizada.",
          "Últimos 3 comprobantes de pago del Monotributo.",
          "Últimos 3 meses de movimientos bancarios o de billetera virtual.",
          "DNI (frente y dorso) y selfie con DNI en mano.",
          "Comprobante de domicilio (factura de luz, agua, gas u otro servicio).",
          "2 referencias personales mayores de 18 años (nombre, apellido, teléfono y DNI).",
          "1 referencia laboral (nombre, apellido, teléfono y actividad o vínculo laboral).",
        ],
      },
    ],
    avisos: [
      {
        titulo: "Importante sobre las referencias",
        texto:
          "Nos comunicaremos con ellas para verificar la información. Te agradecemos que les avises previamente.",
      },
      {
        titulo: "Importante",
        texto:
          "Sin la documentación solicitada no podemos continuar con la evaluación. La aprobación y el monto están sujetos a evaluación.",
      },
    ],
    cierre: "¡Gracias por tu colaboración!",
  },
  comercial: {
    titulo: "Requisitos crédito comercial",
    grupos: [
      {
        titulo: "Datos personales",
        items: [
          "DNI (frente y dorso).",
          "Selfie con DNI en mano.",
          "Comprobante de domicilio (factura de luz, gas, agua u otro servicio).",
        ],
      },
      {
        titulo: "Negocio",
        items: ["Fotos del frente y del stock.", "Redes sociales (si tiene).", "Ingresos mensuales estimados."],
      },
      {
        titulo: "Documentación fiscal",
        items: ["Constancia de ARCA.", "Pagos del monotributo.", "Facturas de los últimos 3 meses."],
      },
      {
        titulo: "Ingresos",
        items: ["Extractos bancarios o de billeteras virtuales de los últimos 3 meses."],
      },
      {
        titulo: "2 referencias mayores de 18 años",
        items: ["Nombre y apellido.", "Teléfono.", "DNI."],
      },
    ],
    avisos: [
      {
        titulo: "Referencias",
        texto: "Nos comunicaremos con ellas para verificar los datos. Por favor, avisales previamente.",
      },
      {
        titulo: "Importante",
        texto:
          "La documentación nos permite evaluar tu solicitud. La aprobación y el monto están sujetos a evaluación.",
      },
    ],
    cierre: "¡Gracias por tu colaboración!",
  },
};
