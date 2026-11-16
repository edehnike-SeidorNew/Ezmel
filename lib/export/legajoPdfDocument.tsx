import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { LOGO_ASPECT, LOGO_TAGLINE_ASPECT } from "@/lib/brand/aspect";
import { CHECKLIST_LABELS, FILE_CATEGORIES } from "@/lib/types/legajo";
import type { LegajoFileCategoryKey, LegajoFormValues } from "@/lib/types/legajo";
import { formatCurrencyAR } from "@/lib/format/currency";
import { serviciosConDatos } from "./common";

/**
 * Documento PDF del legajo. Lo usan el servidor (descarga desde la plataforma) y el navegador (solicitud
 * del cliente), así que no depende de Buffer ni de módulos de Node: las imágenes llegan ya resueltas.
 */

/** Imagen para el PDF: una URL / data URL, o los bytes con su formato. */
export type PdfImageSrc = string | { data: Uint8Array; format: "png" | "jpg" };

export interface PdfAssets {
  logo: PdfImageSrc;
  logoTagline: PdfImageSrc;
}

export interface PdfFile {
  /** Texto que va debajo de la imagen. */
  caption: string;
  /** MIME de la imagen: image/png o image/jpeg. */
  type: string;
  width: number;
  height: number;
  src: PdfImageSrc;
}

export type PdfFilesByCategory = Partial<Record<LegajoFileCategoryKey, PdfFile[]>>;

export interface LegajoPdfMetadata {
  title: string;
  subject: string;
  /** Datos del legajo en formato legible por la plataforma (ver lib/legajo/payload.ts). */
  keywords: string;
}

/** Los tipos de react-pdf piden `Buffer`; en el navegador y en Node alcanza con los bytes (Uint8Array) o una URL. */
const toSrc = (src: PdfImageSrc) => src as never;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  bannerBar: {
    backgroundColor: "#1a5f6f",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    padding: 6,
    letterSpacing: 2,
  },
  subtitle: { fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 8 },
  heading: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#1a5f6f",
    marginTop: 16,
    marginBottom: 6,
    padding: 6,
  },
  row: { flexDirection: "row", borderBottom: "1pt solid #a9cbcd" },
  labelCell: { width: "35%", backgroundColor: "#eaf4f4", padding: 5, fontWeight: 700, color: "#1a5f6f" },
  valueCell: { width: "65%", padding: 5 },
  tableHeaderCell: { padding: 5, fontWeight: 700, backgroundColor: "#eaf4f4", color: "#1a5f6f" },
  tableCell: { padding: 5 },
  imagePage: {
    padding: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrap: { display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10 },
  imageCaption: { marginTop: 10, fontSize: 9, color: "#64748b", textAlign: "center" },
});

function Logo({ assets, width }: { assets: PdfAssets; width: number }) {
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML img
    <Image src={toSrc(assets.logo)} style={{ width, height: width / LOGO_ASPECT }} />
  );
}

/** Logo con el subtítulo "Servicios financieros" debajo, para el encabezado. */
function LogoTagline({ assets, width }: { assets: PdfAssets; width: number }) {
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML img
    <Image src={toSrc(assets.logoTagline)} style={{ width, height: width / LOGO_TAGLINE_ASPECT }} />
  );
}

/** Logo chico y subtítulo en la esquina inferior derecha de cada hoja impresa. */
function LogoFooter({ assets }: { assets: PdfAssets }) {
  return (
    <View fixed style={{ position: "absolute", bottom: 8, right: 22, alignItems: "flex-end" }}>
      <Logo assets={assets} width={80} />
      <Text style={{ marginTop: 2, fontSize: 5.5, letterSpacing: 1.2, color: "#1b4558" }}>SERVICIOS FINANCIEROS</Text>
    </View>
  );
}

function LabelValueTable({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([label, value]) => (
        <View style={styles.row} key={label}>
          <Text style={styles.labelCell}>{label}</Text>
          <Text style={styles.valueCell}>{value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

// Área de contenido aproximada de una página A4 con padding de 24pt.
const MAX_WIDTH_PT = 500;
const MAX_HEIGHT_PT = 700;
const PX_TO_PT = 0.75;

function fitToBox(widthPx: number, heightPx: number, maxHeightPt = MAX_HEIGHT_PT) {
  const widthPt = widthPx * PX_TO_PT;
  const heightPt = heightPx * PX_TO_PT;
  const scale = Math.min(MAX_WIDTH_PT / widthPt, maxHeightPt / heightPt, 1);
  return { width: widthPt * scale, height: heightPt * scale };
}

const PDF_IMAGE_FORMAT: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

/**
 * Páginas de una categoría: el título y las observaciones van arriba de la
 * primera imagen (no en una hoja aparte), y las siguientes van una por hoja.
 */
function CategoryPages({
  label,
  observaciones,
  images,
  assets,
}: {
  label: string;
  observaciones: string;
  images: PdfFile[];
  assets: PdfAssets;
}) {
  const usable = images.filter((image) => PDF_IMAGE_FORMAT[image.type]);

  const encabezado = (
    <>
      <Text style={styles.heading} minPresenceAhead={70}>
        {label.toUpperCase()}
      </Text>
      <Text style={styles.subtitle}>Observaciones: {observaciones || "—"}</Text>
    </>
  );

  return (
    <>
      {usable.map((image, i) => {
        const primera = i === 0;
        const { width, height } = fitToBox(image.width, image.height, primera ? 600 : MAX_HEIGHT_PT);
        return (
          <Page key={i} size="A4" style={primera ? styles.page : styles.imagePage}>
            {primera && encabezado}
            <View style={styles.imageWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML img */}
              <Image style={{ width, height }} src={toSrc(image.src)} />
              <Text style={styles.imageCaption}>{image.caption}</Text>
            </View>
            <LogoFooter assets={assets} />
          </Page>
        );
      })}
    </>
  );
}

interface CategoryInfo {
  index: number;
  label: string;
  observaciones: string;
  images: PdfFile[];
}

/** Categorías sin archivos: bloques compactos que comparten hoja, en vez de una hoja cada una. */
function EmptyBlocks({ items }: { items: CategoryInfo[] }) {
  return (
    <>
      {items.map((c) => (
        <View key={c.index} wrap={false}>
          <Text style={styles.heading} minPresenceAhead={70}>
            {c.label.toUpperCase()}
          </Text>
          <Text style={styles.subtitle}>Observaciones: {c.observaciones || "—"}</Text>
          <Text>(sin archivos adjuntos)</Text>
        </View>
      ))}
    </>
  );
}

export interface LegajoPdfProps {
  data: LegajoFormValues;
  files: PdfFilesByCategory;
  assets: PdfAssets;
  metadata?: LegajoPdfMetadata;
  /** Línea bajo el logo de la primera hoja. */
  subtitle?: string;
}

export function LegajoPdfDocument({
  data,
  files,
  assets,
  metadata,
  subtitle = "Carpeta de documentación del cliente",
}: LegajoPdfProps) {
  const servicios = serviciosConDatos(data.servicios);
  const categories: CategoryInfo[] = FILE_CATEGORIES.map((category, i) => ({
    index: 5 + i,
    label: category.label,
    observaciones: data[category.obsKey],
    images: files[category.key] ?? [],
  }));

  // Las categorías con archivos van cada una en sus hojas. Las vacías no ocupan hojas sueltas:
  // van juntas en un bloque corto en la hoja final, sobre el checklist.
  const tieneArchivos = (c: CategoryInfo) => c.images.some((image) => PDF_IMAGE_FORMAT[image.type]);
  const conArchivos = categories.filter(tieneArchivos);
  const sinArchivos = categories.filter((c) => !tieneArchivos(c));

  return (
    <Document
      title={metadata?.title}
      subject={metadata?.subject}
      keywords={metadata?.keywords}
      creator="EzMel"
      producer="EzMel"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.bannerBar}>LEGAJO DE CLIENTE</Text>
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <LogoTagline assets={assets} width={150} />
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <Text style={styles.heading} minPresenceAhead={70}>DATOS GENERALES</Text>
        <LabelValueTable
          rows={[
            ["Nombre y Apellido", data.nombreApellido],
            ["N.º de Préstamo", data.numeroPrestamo],
            ["DNI", data.dni],
            ["Fecha de Apertura del Legajo", data.fechaApertura],
          ]}
        />

        <Text style={styles.heading} minPresenceAhead={70}>DATOS PERSONALES</Text>
        <LabelValueTable
          rows={[
            ["Nombre", data.nombre],
            ["Apellido", data.apellido],
            ["Teléfono", data.telefono],
            ["Email", data.email],
            ["Dirección", data.direccion],
            ["Código postal", data.codigoPostal],
            ["Referencia 1", data.referencia1],
            ["Referencia 2", data.referencia2],
            ...(data.referenciaLaboral ? [["Referencia laboral", data.referenciaLaboral] as [string, string]] : []),
          ]}
        />

        <Text style={styles.heading} minPresenceAhead={70}>MONTO DE PRÉSTAMO</Text>
        <LabelValueTable rows={[["Monto de Préstamo", formatCurrencyAR(data.montoPrestamo)]]} />

        {servicios.length > 0 && (
          <>
            <Text style={styles.heading} minPresenceAhead={70}>SERVICIOS</Text>
            <View style={styles.row}>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Servicio</Text>
              <Text style={[styles.tableHeaderCell, { width: "27%" }]}>Titular</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Fecha</Text>
              <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Observaciones</Text>
            </View>
            {servicios.map((row) => (
              <View style={styles.row} key={row.servicio}>
                <Text style={[styles.tableCell, { width: "20%" }]}>{row.servicio}</Text>
                <Text style={[styles.tableCell, { width: "27%" }]}>{row.titular || "—"}</Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{row.fecha || "—"}</Text>
                <Text style={[styles.tableCell, { width: "35%" }]}>{row.observaciones || "—"}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.heading} minPresenceAhead={70}>OBSERVACIONES GENERALES</Text>
        <Text>{data.observacionesGenerales || "—"}</Text>
        <LogoFooter assets={assets} />
      </Page>

      {/* Documentación adjunta: cada categoría con archivos, con su título, y cada archivo
          (o página de PDF) a página completa. */}
      {conArchivos.map((c) => (
        <CategoryPages
          key={c.index}
          label={c.label}
          observaciones={c.observaciones}
          images={c.images}
          assets={assets}
        />
      ))}

      <Page size="A4" style={styles.page}>
        <EmptyBlocks items={sinArchivos} />
        <Text style={styles.heading} minPresenceAhead={70}>CHECKLIST FINAL</Text>
        <LabelValueTable
          rows={(Object.keys(CHECKLIST_LABELS) as (keyof typeof CHECKLIST_LABELS)[]).map((key) => [
            CHECKLIST_LABELS[key],
            data.checklist[key] ? "Sí" : "No",
          ])}
        />

        <Text style={styles.heading} minPresenceAhead={70}>RESPONSABLE DEL LEGAJO</Text>
        <LabelValueTable
          rows={[
            ["Responsable", data.responsable],
            ["Fecha", data.fechaResponsable],
          ]}
        />
        <LogoFooter assets={assets} />
      </Page>
    </Document>
  );
}
