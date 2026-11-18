import type { BloqueDocumento, DocumentoContenido } from "@/lib/documento/tipos";
import type { TextSegment } from "@/lib/contrato/buildContratoBlocks";
import { sumarMeses } from "@/lib/cotizador/calcular";
import { MUTUANTE_INFO, REFINANCIACION_ACREEDOR } from "@/lib/data/contratoFijo";
import { b, diasDelMes, moneyCentavos, ordinal, pct, relleno, t } from "@/lib/documento/formato";
import { formatFechaCorta } from "@/lib/format/dateEs";
import { montoEnLetrasPesos, numeroALetras } from "@/lib/format/numberToWords";
import { formatDni, formatDomicilio } from "@/lib/format/personal";
import type { RefinanciacionDatos } from "@/lib/types/refinanciacion";

type ClaveClausula =
  | "reconocimiento"
  | "quita"
  | "monto"
  | "plan"
  | "intereses"
  | "consumidor"
  | "pago"
  | "mora"
  | "caducidad"
  | "novacion"
  | "imputacion"
  | "pagare"
  | "garantia"
  | "cancelacion"
  | "gastos"
  | "domicilios"
  | "competencia"
  | "ejemplares";

/** "PESOS DOSCIENTOS MIL CON 00/100 ($ 200.000,00)" */
const pesos = (n: number) => `${montoEnLetrasPesos(n)} (${moneyCentavos(n)})`;

/** Usa DNI con puntos si parece un DNI; si es un CUIT lo deja como está. */
const documento = (valor: string) => formatDni(valor);

/**
 * Contrato de refinanciación de deuda. El texto sigue el modelo "Contrato de refinanciación" aprobado: las
 * cláusulas opcionales (quita, información al consumidor, pagaré y garantía personal) se incluyen sólo si
 * corresponden, y las demás se renumeran solas, junto con las referencias entre cláusulas.
 */
export function buildRefinanciacionContenido(d: RefinanciacionDatos): DocumentoContenido {
  const acreedor = REFINANCIACION_ACREEDOR;
  const cuotas = d.cantidadCuotas;
  const ultimaCuota = sumarMeses(d.fechaPrimeraCuota, Math.max(cuotas - 1, 0));
  const porcentajeQuita = d.montoDeuda > 0 ? (d.montoQuita / d.montoDeuda) * 100 : 0;

  // Qué cláusulas entran y en qué orden: define la numeración y las referencias cruzadas.
  const incluidas: ClaveClausula[] = [
    "reconocimiento",
    ...(d.conQuita ? (["quita"] as const) : []),
    "monto",
    "plan",
    "intereses",
    ...(d.esConsumidor ? (["consumidor"] as const) : []),
    "pago",
    "mora",
    "caducidad",
    "novacion",
    "imputacion",
    ...(d.conPagare ? (["pagare"] as const) : []),
    ...(d.conGarante ? (["garantia"] as const) : []),
    "cancelacion",
    "gastos",
    "domicilios",
    "competencia",
    "ejemplares",
  ];
  const numero = (clave: ClaveClausula) => incluidas.indexOf(clave) + 1;
  /** "cuarta": cómo se nombra otra cláusula dentro del texto. */
  const ref = (clave: ClaveClausula) => ordinal(numero(clave)).toLowerCase();

  const cuotasTexto =
    cuotas === 1
      ? [t("una (1) cuota de "), b(pesos(d.importeCuota)), t(", con vencimiento el "), b(formatFechaCorta(d.fechaPrimeraCuota)), t(".")]
      : [
          b(`${cuotas} (${numeroALetras(cuotas).toUpperCase()})`),
          t(" cuotas mensuales, iguales y consecutivas de "),
          b(pesos(d.importeCuota)),
          t(" cada una, venciendo la primera el "),
          b(formatFechaCorta(d.fechaPrimeraCuota)),
          t(" y las restantes el mismo día de cada mes subsiguiente, hasta la cancelación total el "),
          b(formatFechaCorta(ultimaCuota)),
          t("."),
        ];

  const textos: Record<ClaveClausula, { titulo: string; texto: TextSegment[] }> = {
    reconocimiento: {
      titulo: "RECONOCIMIENTO DE DEUDA",
      texto: [
        t(
          "EL DEUDOR reconoce expresamente adeudar a EL ACREEDOR la suma indicada en el antecedente II, así como la " +
            "causa, la legitimidad y la exigibilidad de la obligación, renunciando a cuestionarlas en el futuro por " +
            "cualquier vía."
        ),
      ],
    },
    quita: {
      titulo: "QUITA",
      texto: [
        t("EL ACREEDOR otorga a EL DEUDOR una quita de "),
        b(pesos(d.montoQuita)),
        t(", equivalente al "),
        b(pct(porcentajeQuita)),
        t(
          ` de la deuda, condicionada al cumplimiento íntegro y en término del plan de pagos establecido en la cláusula ${ref("plan")}. ` +
            "El incumplimiento deja sin efecto la quita de pleno derecho."
        ),
      ],
    },
    monto: {
      titulo: "MONTO REFINANCIADO",
      texto: [
        t("LAS PARTES fijan el monto total refinanciado en la suma de "),
        b(pesos(d.montoRefinanciado)),
        t(
          d.conQuita
            ? `, comprensiva de capital, intereses devengados y gastos, con deducción de la quita de la cláusula ${ref("quita")}.`
            : ", comprensiva de capital, intereses devengados y gastos."
        ),
      ],
    },
    plan: {
      titulo: "PLAN DE PAGOS",
      texto:
        d.anticipo > 0
          ? [
              t("EL DEUDOR abonará el monto refinanciado del siguiente modo:\na) Anticipo de "),
              b(pesos(d.anticipo)),
              t(", pagadero en este acto, sirviendo el presente de suficiente recibo;\nb) "),
              ...cuotasTexto,
            ]
          : [t("EL DEUDOR abonará el monto refinanciado del siguiente modo:\n"), ...cuotasTexto],
    },
    intereses: {
      titulo: "INTERESES DE FINANCIACIÓN",
      texto: [
        t("El saldo refinanciado devengará un interés a una tasa nominal anual del "),
        b(pct(d.tna)),
        t(" (TNA), equivalente a una tasa efectiva anual del "),
        b(pct(d.tea)),
        t(" (TEA), ya incluido en el importe de cada cuota. Los intereses no serán capitalizables."),
      ],
    },
    consumidor: {
      titulo: "INFORMACIÓN AL DEUDOR CONSUMIDOR",
      texto: [
        t(
          "Cuando EL DEUDOR revista el carácter de consumidor, se deja constancia de que se le informó de manera " +
            "previa, clara y por escrito: el monto financiado, la tasa de interés efectiva anual, el costo financiero " +
            "total, el sistema de amortización, la cantidad, periodicidad y monto de las cuotas, y los gastos, seguros " +
            "o adicionales aplicables, conforme el artículo 36 de la Ley 24.240."
        ),
      ],
    },
    pago: {
      titulo: "LUGAR Y MEDIO DE PAGO",
      texto: [
        t("Los pagos se efectuarán mediante "),
        b(d.medioPago),
        t(", debiendo acreditarse con el comprobante respectivo. EL ACREEDOR entregará recibo por cada pago recibido."),
      ],
    },
    mora: {
      titulo: "MORA E INTERESES PUNITORIOS",
      texto: [
        t(
          "La mora se producirá de pleno derecho por el solo vencimiento de los plazos, sin necesidad de interpelación " +
            "alguna. Producida la mora, se devengará un interés punitorio equivalente al "
        ),
        b(pct(d.punitorioPorcentaje)),
        t(` del interés pactado en la cláusula ${ref("intereses")}, no capitalizable, hasta el efectivo pago.`),
      ],
    },
    caducidad: {
      titulo: "CADUCIDAD DE LOS PLAZOS",
      texto: [
        t(
          "La falta de pago de dos (2) cuotas, consecutivas o alternadas, previa intimación fehaciente a EL DEUDOR al " +
            "domicilio constituido otorgándole un plazo no inferior a diez (10) días corridos para regularizar, " +
            "facultará a EL ACREEDOR a considerar decaídos todos los plazos pendientes y a exigir el saldo total " +
            "adeudado con más sus intereses. Operada la caducidad, " +
            (d.conQuita ? `quedará sin efecto la quita de la cláusula ${ref("quita")} y ` : "") +
            "se imputará lo abonado a la deuda original."
        ),
      ],
    },
    novacion: {
      titulo: "NO NOVACIÓN",
      texto: [
        t(
          "LAS PARTES declaran expresamente que el presente acuerdo no importa novación de la obligación original, la " +
            "que subsiste con todas sus garantías y accesorios, conforme el artículo 940 del Código Civil y Comercial " +
            "de la Nación. La refinanciación constituye únicamente una modificación de las modalidades de pago."
        ),
      ],
    },
    imputacion: {
      titulo: "IMPUTACIÓN DE PAGOS",
      texto: [
        t(
          "Los pagos se imputarán primero a gastos, luego a intereses punitorios, luego a intereses de financiación y " +
            "finalmente a capital, salvo indicación expresa en contrario de EL DEUDOR al momento de pagar."
        ),
      ],
    },
    pagare: {
      titulo: "PAGARÉ EN GARANTÍA",
      texto: [
        t("En garantía del cumplimiento, EL DEUDOR suscribe en este acto un pagaré sin protesto por la suma de "),
        b(pesos(d.montoPagare)),
        t(", con vencimiento el "),
        b(formatFechaCorta(d.fechaVencimientoPagare)),
        t(
          ". LAS PARTES declaran que el pagaré se libra con causa en el presente acuerdo y sin efecto novatorio, y que " +
            "será restituido una vez cancelada íntegramente la deuda."
        ),
      ],
    },
    garantia: {
      titulo: "GARANTÍA PERSONAL",
      texto: [
        b(d.garanteNombre.toUpperCase()),
        t(", DNI N.º "),
        b(documento(d.garanteDocumento)),
        t(", con domicilio en "),
        b(formatDomicilio(d.garanteDomicilio)),
        t(
          ", se constituye en fiador solidario, liso, llano y principal pagador de las obligaciones asumidas por EL " +
            "DEUDOR, con renuncia a los beneficios de excusión y división, hasta la total cancelación de la deuda."
        ),
      ],
    },
    cancelacion: {
      titulo: "CANCELACIÓN ANTICIPADA",
      texto: [
        t(
          "EL DEUDOR podrá cancelar anticipadamente el saldo, en forma total o parcial, con la consiguiente reducción " +
            "proporcional de los intereses no devengados."
        ),
      ],
    },
    gastos: {
      titulo: "GASTOS E IMPUESTOS",
      texto: [t("Los gastos, sellados e impuestos que genere el presente estarán a cargo de "), b(d.gastosACargoDe), t(".")],
    },
    domicilios: {
      titulo: "DOMICILIOS Y NOTIFICACIONES",
      texto: [
        t(
          "LAS PARTES constituyen domicilio en los indicados en el encabezamiento, donde serán válidas todas las " +
            "notificaciones judiciales y extrajudiciales. Todo cambio deberá comunicarse por medio fehaciente dentro " +
            "de los cinco (5) días."
        ),
      ],
    },
    competencia: {
      titulo: "COMPETENCIA",
      texto: [
        t("Para toda cuestión derivada del presente, LAS PARTES se someten a la jurisdicción de los tribunales ordinarios de "),
        b(d.competencia),
        t(
          ". Cuando EL DEUDOR revista el carácter de consumidor y la acción sea promovida por EL ACREEDOR, será " +
            "competente el tribunal de su domicilio real, siendo nulo todo pacto en contrario."
        ),
      ],
    },
    ejemplares: {
      titulo: "EJEMPLARES",
      texto: [t("Se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, recibiendo cada parte el suyo.")],
    },
  };

  const nombreDeudor = d.deudorNombre;
  const bloques: BloqueDocumento[] = [
    // Encabezamiento en un solo párrafo corrido (como el contrato de mutuo y el convenio de anulación): nombres en
    // mayúsculas, datos en negrita y relleno de guiones al final para que no se pueda agregar texto en el sobrante.
    {
      texto: [
        t("En la ciudad de "),
        b(MUTUANTE_INFO.domicilio),
        t(", a los "),
        b(diasDelMes(d.fechaContrato)),
        t(", entre: "),
        b(acreedor.nombre.toUpperCase()),
        t(", DNI/CUIT N.º "),
        b(acreedor.documento),
        t(", con domicilio en "),
        b(acreedor.domicilio),
        t(", en adelante «EL ACREEDOR»; y "),
        b(nombreDeudor.toUpperCase()),
        t(", DNI/CUIT N.º "),
        b(documento(d.deudorDocumento)),
        t(", con domicilio real en "),
        b(formatDomicilio(d.deudorDomicilio)),
        t(" y domicilio electrónico en "),
        b(d.deudorEmail),
        t(
          ", en adelante «EL DEUDOR»; ambos en conjunto «LAS PARTES», convienen celebrar el presente contrato de " +
            "refinanciación de deuda, sujeto a los antecedentes y cláusulas que siguen."
        ),
        relleno(),
      ],
    },
    {
      titulo: "ANTECEDENTES",
      texto: [
        t("I. EL DEUDOR mantiene con EL ACREEDOR una deuda originada en "),
        b(d.origenDeuda),
        t(", instrumentada en "),
        b(d.instrumentoDeuda),
        t(", de fecha "),
        b(formatFechaCorta(d.fechaDeuda)),
        t(".\nII. Dicha deuda asciende a la suma de "),
        b(pesos(d.montoDeuda)),
        t(" en concepto de capital, con más los intereses devengados hasta la fecha del presente.\n"),
        t("III. La obligación se encuentra vencida, es líquida y exigible desde el "),
        b(formatFechaCorta(d.fechaVencimientoDeuda)),
        t(
          ".\nIV. EL DEUDOR manifestó su voluntad de regularizar su situación y solicitó un plan de pagos, a lo que EL " +
            "ACREEDOR accede en los términos del presente."
        ),
      ],
    },
    { titulo: "CLÁUSULAS" },
    ...incluidas.map((clave, i): BloqueDocumento => ({
      titulo: `${ordinal(i + 1)} — ${textos[clave].titulo}`,
      texto: [...textos[clave].texto, relleno()],
    })),
    {
      texto: [
        t("En prueba de conformidad, previa lectura y ratificación, se firma en el lugar y fecha indicados en el encabezamiento."),
      ],
    },
  ];

  return {
    titulo: "CONTRATO DE REFINANCIACIÓN DE DEUDA",
    bloques,
    firmas: {
      estilo: "columnas",
      bloques: [
        {
          rol: "EL ACREEDOR",
          lineas: [[t("Aclaración: "), b(acreedor.nombre)], [t("DNI/CUIT: "), b(acreedor.documento)]],
        },
        {
          rol: "EL DEUDOR",
          // En la firma del cliente no va su nombre ni su documento: queda la línea para completar a mano.
          lineas: [[t("Aclaración: " + "_".repeat(28))], [t("DNI/CUIT: " + "_".repeat(20))]],
        },
        ...(d.conGarante
          ? [
              {
                rol: "EL FIADOR",
                lineas: [
                  [t("Aclaración: "), b(d.garanteNombre)],
                  [t("DNI/CUIT: "), b(documento(d.garanteDocumento))],
                ],
              },
            ]
          : []),
      ],
    },
  };
}
