import type { TextSegment } from "@/lib/contrato/buildContratoBlocks";
import { MUTUANTE_INFO } from "@/lib/data/contratoFijo";
import { b, diasDelMes, moneySinCentavos, relleno, t } from "@/lib/documento/formato";
import type { DocumentoContenido } from "@/lib/documento/tipos";
import { formatFechaLarga } from "@/lib/format/dateEs";
import { montoEnLetras, numeroALetras } from "@/lib/format/numberToWords";
import { formatDni, formatDomicilio } from "@/lib/format/personal";
import type { AnulacionDatos } from "@/lib/types/anulacion";

/** "$ 100.000 (cien mil pesos argentinos)" */
const pesos = (n: number) => `${moneySinCentavos(n)} (${montoEnLetras(n)})`;

/**
 * Convenio de anulación de contrato de mutuo. El texto sigue el modelo "Convenio de anulación" aprobado:
 * deja sin efecto el contrato y el pagaré, y declara que no se entregó dinero ni quedan sumas pendientes.
 */
export function buildAnulacionContenido(d: AnulacionDatos): DocumentoContenido {
  const nombre = d.mutuarioNombre.toUpperCase();
  const dni = formatDni(d.mutuarioDni);
  const fechaOriginal = formatFechaLarga(d.fechaContratoOriginal);
  const vencimiento = formatFechaLarga(d.fechaVencimiento);

  const cuotasTexto =
    d.cantidadCuotas === 1
      ? "una (1) cuota con vencimiento el "
      : `${numeroALetras(d.cantidadCuotas)} (${d.cantidadCuotas}) cuotas, la última con vencimiento el `;

  const clausula = (titulo: string, texto: TextSegment[]) => ({ titulo, texto: [...texto, relleno()] });

  return {
    titulo: "CONVENIO DE ANULACIÓN DE CONTRATO DE MUTUO",
    bloques: [
      {
        texto: [
          t("Entre: "),
          b(MUTUANTE_INFO.razonSocial),
          t(", CUIT "),
          b(MUTUANTE_INFO.cuit),
          t(`, ${MUTUANTE_INFO.tipoSocietario}, con domicilio legal en la ciudad de `),
          b(MUTUANTE_INFO.domicilio),
          t(", representada en este acto por su Administrador, Sr. "),
          b(MUTUANTE_INFO.administradorNombre),
          t(", DNI "),
          b(MUTUANTE_INFO.administradorDni),
          t(', en adelante "EL MUTUANTE"; y por la otra parte '),
          b(nombre),
          t(", DNI "),
          b(dni),
          t(", con domicilio en "),
          b(formatDomicilio(d.mutuarioDomicilio)),
          t(", correo electrónico "),
          b(d.mutuarioEmail),
          t(', en adelante "EL MUTUARIO", convienen celebrar el presente convenio de anulación conforme a las siguientes cláusulas.'),
          relleno(),
        ],
      },
      clausula("PRIMERA – Antecedentes", [
        t("Con fecha "),
        b(fechaOriginal),
        t(" las partes celebraron un contrato de mutuo"),
        ...(d.docusignId ? [t(" (Docusign Envelope ID "), b(d.docusignId), t(")")] : []),
        t(" por la suma de "),
        b(pesos(d.montoPrestado)),
        t(", con obligación de devolver la suma total de "),
        b(pesos(d.montoADevolver)),
        t(" en "),
        t(cuotasTexto),
        b(vencimiento),
        t(". En el mismo acto, EL MUTUARIO suscribió un pagaré a favor de EL MUTUANTE por "),
        b(moneySinCentavos(d.montoADevolver)),
        t(", con vencimiento el "),
        b(vencimiento),
        t(", en garantía de dicha obligación."),
      ]),
      clausula("SEGUNDA – Anulación", [
        t(
          "Por medio del presente, las partes, de común acuerdo, dejan sin efecto y anulado en forma total el contrato " +
            "de mutuo individualizado en la cláusula PRIMERA, el cual no producirá efecto alguno entre ellas ni frente a " +
            "terceros."
        ),
      ]),
      clausula("TERCERA – Pagaré", [
        t(
          "Queda igualmente anulado y sin valor alguno el pagaré suscripto por EL MUTUARIO en garantía del contrato " +
            "anulado. EL MUTUANTE se obliga a no presentarlo al cobro, no ejecutarlo, no endosarlo ni transmitirlo a " +
            "terceros bajo ningún título, y a dejar sin efecto el ejemplar electrónico y toda copia del mismo."
        ),
      ]),
      clausula("CUARTA – Sumas de dinero", [
        t("Las partes declaran que la suma de "),
        b(pesos(d.montoPrestado)),
        t(
          " nunca fue entregada ni transferida a EL MUTUARIO, y que en consecuencia no existen sumas pendientes de pago " +
            "por capital, intereses compensatorios, moratorios, punitorios, gastos ni honorarios derivados del contrato " +
            "anulado."
        ),
      ]),
      clausula("QUINTA – Liberación recíproca", [
        t(
          "Con la firma del presente, las partes declaran que nada tienen que reclamarse recíprocamente por ningún " +
            "concepto derivado del contrato de mutuo y del pagaré anulados, otorgándose la más amplia y total liberación."
        ),
      ]),
      clausula("SEXTA – Firma electrónica y digital", [
        t(
          "Las partes acuerdan expresamente que el presente convenio podrá ser suscripto mediante firma electrónica y/o " +
            "firma digital, a través de cualquier plataforma o mecanismo que permita identificar razonablemente al " +
            "firmante, reconociéndole plena validez, eficacia y fuerza probatoria."
        ),
      ]),
      clausula("SÉPTIMA – Jurisdicción y domicilios", [
        t(
          "Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales ordinarios con " +
            "competencia en la Provincia de Buenos Aires, constituyendo domicilio en los indicados al inicio del " +
            "presente. A prueba de conformidad, se firma este ejemplar de un mismo tenor y a un mismo efecto, en la " +
            "provincia de Buenos Aires, a los "
        ),
        b(diasDelMes(d.fechaConvenio)),
        t("."),
      ]),
    ],
    firmas: {
      estilo: "lineas",
      titulo: "FIRMAS",
      bloques: [
        {
          rol: "Firma del MUTUANTE (Administrador)",
          lineas: [
            [t("Nombre completo: "), b(MUTUANTE_INFO.administradorNombre)],
            [t("DNI: "), b(MUTUANTE_INFO.administradorDni)],
            [t(`En representación de ${MUTUANTE_INFO.razonSocial}`)],
          ],
        },
        {
          rol: "Firma del MUTUARIO",
          lineas: [[t("Nombre completo: "), b(nombre)], [t("DNI: "), b(dni)]],
        },
      ],
    },
  };
}
