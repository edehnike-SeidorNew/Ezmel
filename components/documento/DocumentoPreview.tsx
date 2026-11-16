import Image from "next/image";
import { LINEA_FIRMA, type DocumentoContenido } from "@/lib/documento/tipos";
import type { TextSegment } from "@/lib/contrato/buildContratoBlocks";

const HOJA_CLASS = "mx-auto max-w-3xl border border-slate-300 bg-white p-4 shadow-sm sm:p-10";
const TITULO_CLASS =
  "bg-[#1a5f6f] px-4 py-3 text-center text-[17px] font-bold uppercase sm:text-[21px] tracking-wide text-white";
const DATO_CLASS = "text-[15px] font-bold text-black";

function Segments({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.bold ? (
          <strong key={i} className={DATO_CLASS}>
            {s.text}
          </strong>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-6 bg-[#1a5f6f] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
      {children}
    </h3>
  );
}

/** Vista previa de un documento de cláusulas, con el mismo formato que el contrato de mutuo. */
export function DocumentoPreview({ c }: { c: DocumentoContenido }) {
  return (
    <div className={HOJA_CLASS} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1 className={TITULO_CLASS}>{c.titulo}</h1>
      <Image
        src="/logo-tagline.png"
        alt="EzMel, servicios financieros"
        width={1200}
        height={436}
        unoptimized
        className="mx-auto mt-5 h-auto w-[220px]"
      />

      <div className="mt-6">
        {c.bloques.map((b, i) =>
          b.titulo ? (
            <div key={i}>
              <SectionBar>{b.titulo}</SectionBar>
              {b.texto && (
                <p className="whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
                  <Segments segments={b.texto} />
                </p>
              )}
            </div>
          ) : (
            <p key={i} className="mt-3 whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
              <Segments segments={b.texto ?? []} />
            </p>
          )
        )}
      </div>

      {c.firmas.estilo === "columnas" ? (
        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2">
          {c.firmas.bloques.map((f) => (
            <div key={f.rol} className="border-t border-black pt-1 text-center text-sm text-slate-800">
              <p className="font-bold text-black">{f.rol}</p>
              {f.lineas.map((linea, j) => (
                <p key={j}>
                  <Segments segments={linea} />
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {c.firmas.titulo && <SectionBar>{c.firmas.titulo}</SectionBar>}
          <div className="space-y-10" style={{ marginTop: 40 }}>
            {c.firmas.bloques.map((f) => (
              <div key={f.rol} className="text-sm text-slate-800">
                <p className="font-semibold text-[#1a5f6f]">
                  {f.rol}: {LINEA_FIRMA}
                </p>
                {f.lineas.map((linea, j) => (
                  <p key={j} style={{ marginTop: 22 }}>
                    <Segments segments={linea} />
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
