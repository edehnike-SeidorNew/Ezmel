import { renderToBuffer } from "@react-pdf/renderer";
import { LOGO_PNG, LOGO_TAGLINE_PNG } from "@/lib/brand/logo";
import { buildLegajoPdfMetadata } from "@/lib/legajo/payload";
import type { LegajoFileCategoryKey } from "@/lib/types/legajo";
import type { ExportFileData, ExportInput } from "./common";
import { LegajoPdfDocument, type PdfAssets, type PdfFile, type PdfFilesByCategory } from "./legajoPdfDocument";

const PDF_IMAGE_FORMAT: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

const assets: PdfAssets = {
  logo: { data: LOGO_PNG, format: "png" },
  logoTagline: { data: LOGO_TAGLINE_PNG, format: "png" },
};

function toPdfFile(file: ExportFileData): PdfFile {
  return {
    caption: file.caption,
    type: file.type,
    width: file.width,
    height: file.height,
    src: { data: file.buffer, format: PDF_IMAGE_FORMAT[file.type] ?? "jpg" },
  };
}

export async function generatePdf(input: ExportInput): Promise<Buffer> {
  const files: PdfFilesByCategory = {};
  for (const [key, list] of Object.entries(input.files) as [LegajoFileCategoryKey, ExportFileData[]][]) {
    files[key] = list.map(toPdfFile);
  }

  return renderToBuffer(
    <LegajoPdfDocument
      data={input.data}
      files={files}
      assets={assets}
      metadata={buildLegajoPdfMetadata({
        data: input.data,
        files: Object.fromEntries(
          Object.entries(input.files).map(([key, list]) => [key, (list ?? []).map((f) => f.caption)])
        ) as Partial<Record<LegajoFileCategoryKey, string[]>>,
        origen: "plataforma",
      })}
    />
  );
}
