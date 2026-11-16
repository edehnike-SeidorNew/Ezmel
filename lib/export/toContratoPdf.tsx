import { Document, Font, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { LOGO_ASPECT, LOGO_PNG, LOGO_TAGLINE_ASPECT, LOGO_TAGLINE_PNG } from "@/lib/brand/logo";
import {
  buildContratoContenido,
  LINEA_DNI,
  LINEA_NOMBRE,
  type FirmaBloque,
  type TextSegment,
} from "@/lib/contrato/buildContratoBlocks";
import type { ContratoDatos } from "@/lib/types/contrato";

// Las palabras no se cortan con guion al final del renglón (el original aprobado no las parte).
Font.registerHyphenationCallback((word) => [word]);

export const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.4 },
  title: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    color: "#ffffff",
    backgroundColor: "#1a5f6f",
    padding: 8,
    marginBottom: 12,
  },
  heading: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#1a5f6f",
    padding: 5,
    marginTop: 10,
    marginBottom: 6,
  },
  body: { textAlign: "justify", marginBottom: 6 },
  firmaBlock: { marginTop: 10 },
  firmaCampo: { marginTop: 22 },
  firmaLabel: { fontWeight: 700, color: "#1a5f6f" },
});

function Logo({ width }: { width: number }) {
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML img
    <Image src={{ data: LOGO_PNG, format: "png" }} style={{ width, height: width / LOGO_ASPECT }} />
  );
}

/** Logo con el subtítulo "Servicios financieros" debajo, para el encabezado. */
export function LogoTagline({ width }: { width: number }) {
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML img
    <Image src={{ data: LOGO_TAGLINE_PNG, format: "png" }} style={{ width, height: width / LOGO_TAGLINE_ASPECT }} />
  );
}

/** Logo chico y subtítulo en la esquina inferior derecha de cada hoja impresa. */
export function LogoFooter() {
  return (
    <View fixed style={{ position: "absolute", bottom: 8, right: 22, alignItems: "flex-end" }}>
      <Logo width={80} />
      <Text style={{ marginTop: 2, fontSize: 5.5, letterSpacing: 1.2, color: "#1b4558" }}>SERVICIOS FINANCIEROS</Text>
    </View>
  );
}

/** Datos completados: negro puro y un punto más grandes que el texto fijo. */
export const datoStyle = { fontWeight: 700, fontSize: 11, color: "#000000" } as const;

/** Anchos (en %) de las 8 columnas del plan de pagos: N°, Vence, Saldo inicial, Amortización, Interés, IVA, Cuota, Saldo final. */
const ANCHO_COLUMNAS_ANEXO = [6, 12, 15, 15, 14, 12, 13, 13];

/** Celda de la tabla del ANEXO I (todo centrado, con borde fino, como en el original). */
function celdaAnexo(i: number, ultima: boolean) {
  return {
    width: `${ANCHO_COLUMNAS_ANEXO[i]}%`,
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 2,
    textAlign: "center",
    borderRight: ultima ? "none" : "0.5pt solid #c3dadb",
  } as const;
}

/**
 * Pega la puntuación que sigue a un dato en negrita (coma, punto, etc.) al propio dato. Si el renglón se corta
 * justo entre los dos, el generador de PDF trata el corte como una palabra partida y agrega un guion ("30.123.456-").
 */
function pegarPuntuacion(segments: TextSegment[]): TextSegment[] {
  const out: TextSegment[] = [];
  for (const s of segments) {
    const previo = out[out.length - 1];
    const pegada = previo?.bold && !s.bold ? s.text.match(/^[,.;:)"»]+/)?.[0] : undefined;
    if (previo && pegada) {
      out[out.length - 1] = { ...previo, text: previo.text + pegada };
      const resto = s.text.slice(pegada.length);
      if (resto) out.push({ ...s, text: resto });
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export function Segments({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {pegarPuntuacion(segments).map((s, i) => (
        <Text key={i} style={s.bold ? datoStyle : undefined}>
          {s.text}
        </Text>
      ))}
    </>
  );
}

/** Bloques de firma de a dos por fila: línea arriba, rol en negrita y los datos debajo, centrados. */
export function Firmas({ bloques }: { bloques: FirmaBloque[] }) {
  const filas: FirmaBloque[][] = [];
  for (let i = 0; i < bloques.length; i += 2) filas.push(bloques.slice(i, i + 2));

  return (
    <View wrap={false} style={{ marginTop: 56 }}>
      {filas.map((fila, i) => (
        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 44 }}>
          {fila.map((b) => (
            <View key={b.rol} style={{ width: "48%", borderTop: "1pt solid #000000", paddingTop: 4, alignItems: "center" }}>
              <Text style={{ fontWeight: 700, color: "#000000" }}>{b.rol}</Text>
              {b.lineas.map((linea, j) => (
                <Text key={j}>
                  <Segments segments={linea} />
                </Text>
              ))}
            </View>
          ))}
          {fila.length === 1 && <View style={{ width: "48%" }} />}
        </View>
      ))}
    </View>
  );
}

export function ContratoPdfDocument({ datos }: { datos: ContratoDatos }) {
  const c = buildContratoContenido(datos);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{c.titulo}</Text>
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <LogoTagline width={150} />
        </View>
        <Text style={styles.body}>
          <Segments segments={c.numero} />
        </Text>
        <Text style={styles.body}>
          <Segments segments={c.intro} />
        </Text>

        {c.clausulas.map((cl) => (
          <View key={cl.titulo} wrap={false}>
            <Text style={styles.heading}>{cl.titulo}</Text>
            <Text style={styles.body}>
              <Segments segments={cl.texto} />
            </Text>
          </View>
        ))}

        <Text style={[styles.body, { marginTop: 8 }]}>
          <Segments segments={c.cierre} />
        </Text>

        <Firmas bloques={c.firmas} />
        <LogoFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{c.anexo.titulo}</Text>
        <Text style={[styles.body, { textAlign: "center" }]}>
          <Segments segments={c.anexo.subtitulo} />
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 4 }}>
          {c.anexo.resumen.map((r) => (
            <Text key={r.etiqueta} style={{ width: "50%", marginBottom: 3 }}>
              {r.etiqueta}: <Segments segments={r.valor} />
            </Text>
          ))}
        </View>
        <Text style={{ fontSize: 11, fontWeight: 700, color: "#1a5f6f", marginTop: 4, marginBottom: 10 }}>
          {c.anexo.cftea.etiqueta}: <Text style={{ color: "#000000" }}>{c.anexo.cftea.valor}</Text>
        </Text>

        {c.anexo.filas.length > 0 && (
          <View style={{ border: "0.5pt solid #c3dadb" }}>
            <View style={{ flexDirection: "row", backgroundColor: "#1a5f6f" }}>
              {c.anexo.columnas.map((col, i) => (
                <Text
                  key={col}
                  style={[celdaAnexo(i, i === c.anexo.columnas.length - 1), { fontWeight: 700, color: "#ffffff", borderRight: "none" }]}
                >
                  {col}
                </Text>
              ))}
            </View>
            {c.anexo.filas.map((fila) => (
              <View key={fila[0]} wrap={false} style={{ flexDirection: "row", borderTop: "0.5pt solid #c3dadb" }}>
                {fila.map((valor, i) => (
                  <Text key={i} style={[celdaAnexo(i, i === fila.length - 1), i > 0 ? { fontWeight: 700, color: "#000000" } : {}]}>
                    {valor}
                  </Text>
                ))}
              </View>
            ))}
            <View wrap={false} style={{ flexDirection: "row", borderTop: "0.5pt solid #c3dadb" }}>
              {c.anexo.totales.map((valor, i) => (
                <Text key={i} style={[celdaAnexo(i, i === c.anexo.totales.length - 1), { fontWeight: 700, color: "#000000" }]}>
                  {valor}
                </Text>
              ))}
            </View>
          </View>
        )}

        <Firmas bloques={c.anexo.firmas} />
        <LogoFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{c.pagare.titulo}</Text>
        <Text style={[styles.body, { textAlign: "center" }]}>{c.pagare.subtitulo}</Text>
        <Text style={styles.body}>
          <Segments segments={c.pagare.encabezado} />
        </Text>
        <Text style={styles.body}>
          <Segments segments={c.pagare.por} />
        </Text>

        <Text style={styles.body}>
          <Segments segments={c.pagare.cuerpo} />
        </Text>
        <Text style={styles.body}>
          <Segments segments={c.pagare.valor} />
        </Text>
        <Text style={styles.body}>
          <Segments segments={c.pagare.lugarFecha} />
        </Text>

        <View style={{ marginTop: 20 }} wrap={false}>
          <Text style={styles.firmaLabel}>
            {c.pagare.firmanteLabel} {LINEA_NOMBRE}
          </Text>
          <Text style={styles.firmaCampo}>
            Nombre y apellido: <Text style={datoStyle}>{c.pagare.nombre || LINEA_NOMBRE}</Text>
          </Text>
          <Text style={styles.firmaCampo}>
            DNI N°: <Text style={datoStyle}>{c.pagare.documento || LINEA_DNI}</Text>
          </Text>
          <Text style={styles.firmaCampo}>
            Domicilio: <Text style={datoStyle}>{c.pagare.domicilio || LINEA_NOMBRE}</Text>
          </Text>
        </View>
        <LogoFooter />
      </Page>
    </Document>
  );
}

export async function generateContratoPdf(datos: ContratoDatos): Promise<Buffer> {
  return renderToBuffer(<ContratoPdfDocument datos={datos} />);
}
