import { Document, Page, View, Text, renderToBuffer } from "@react-pdf/renderer";
import { LINEA_FIRMA, type DocumentoContenido } from "@/lib/documento/tipos";
import { Firmas, LogoFooter, LogoTagline, Segments, styles } from "./toContratoPdf";

/** PDF de un documento de cláusulas, con el mismo formato que el contrato de mutuo. */
function DocumentoPdf({ c }: { c: DocumentoContenido }) {
  // Con firmas en columnas, el párrafo de cierre ("En prueba de conformidad...") viaja junto a ellas: las firmas
  // nunca quedan solas en una hoja, separadas del texto.
  const ultimo = c.bloques[c.bloques.length - 1];
  const cierre = c.firmas.estilo === "columnas" && ultimo && !ultimo.titulo ? ultimo : null;
  const cuerpo = cierre ? c.bloques.slice(0, -1) : c.bloques;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{c.titulo}</Text>
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <LogoTagline width={150} />
        </View>

        {cuerpo.map((b, i) =>
          b.titulo ? (
            <View key={i} wrap={false}>
              <Text style={styles.heading}>{b.titulo}</Text>
              {b.texto && (
                <Text style={styles.body}>
                  <Segments segments={b.texto} />
                </Text>
              )}
            </View>
          ) : (
            <Text key={i} style={styles.body}>
              <Segments segments={b.texto ?? []} />
            </Text>
          )
        )}

        {c.firmas.estilo === "columnas" ? (
          <View wrap={false}>
            {cierre && (
              <Text style={styles.body}>
                <Segments segments={cierre.texto ?? []} />
              </Text>
            )}
            <Firmas bloques={c.firmas.bloques} />
          </View>
        ) : (
          <View wrap={false}>
            {c.firmas.titulo && <Text style={styles.heading}>{c.firmas.titulo}</Text>}
            {c.firmas.bloques.map((f, i) => (
              <View key={f.rol} style={{ marginTop: i === 0 ? 26 : 8, marginBottom: 18 }}>
                <Text style={styles.firmaLabel}>
                  {f.rol}: {LINEA_FIRMA}
                </Text>
                {f.lineas.map((linea, j) => (
                  <Text key={j} style={styles.firmaCampo}>
                    <Segments segments={linea} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}
        <LogoFooter />
      </Page>
    </Document>
  );
}

export async function generateDocumentoPdf(c: DocumentoContenido): Promise<Buffer> {
  return renderToBuffer(<DocumentoPdf c={c} />);
}
