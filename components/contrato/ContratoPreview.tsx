import Image from "next/image";
import {
  buildContratoContenido,
  LINEA_DNI,
  LINEA_NOMBRE,
  type FirmaBloque,
  type TextSegment,
} from "@/lib/contrato/buildContratoBlocks";
import type { ContratoDatosSchema } from "@/lib/validation/contratoSchema";

const HOJA_CLASS = "mx-auto max-w-3xl border border-slate-300 bg-white p-4 shadow-sm sm:p-10";
const TITULO_CLASS =
  "bg-[#1a5f6f] px-4 py-3 text-center text-[17px] font-bold uppercase sm:text-[21px] tracking-wide text-white";
const DATO_CLASS = "text-[15px] font-bold text-black";

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-6 bg-[#1a5f6f] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
      {children}
    </h3>
  );
}

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

/** Bloques de firma de a dos por fila: línea arriba, rol en negrita y los datos debajo, centrados. */
function Firmas({ bloques }: { bloques: FirmaBloque[] }) {
  return (
    <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2">
      {bloques.map((b) => (
        <div key={b.rol} className="border-t border-black pt-1 text-center text-sm text-slate-800">
          <p className="font-bold text-black">{b.rol}</p>
          {b.lineas.map((linea, j) => (
            <p key={j}>
              <Segments segments={linea} />
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ContratoPreview({ datos }: { datos: ContratoDatosSchema }) {
  const c = buildContratoContenido(datos);

  return (
    <div className={HOJA_CLASS} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div>
        <h1 className={TITULO_CLASS}>{c.titulo}</h1>
        <Image src="/logo-tagline.png" alt="EzMel, servicios financieros" width={1200} height={436} unoptimized className="mx-auto mt-5 h-auto w-[220px]" />

        <p className="mt-6 text-sm text-slate-800">
          <Segments segments={c.numero} />
        </p>
        <p className="mt-3 whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
          <Segments segments={c.intro} />
        </p>

        {c.clausulas.map((cl) => (
          <div key={cl.titulo}>
            <SectionBar>{cl.titulo}</SectionBar>
            <p className="whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
              <Segments segments={cl.texto} />
            </p>
          </div>
        ))}

        <p className="mt-6 whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
          <Segments segments={c.cierre} />
        </p>

        <Firmas bloques={c.firmas} />
      </div>

      <div className="mt-10 border-t-4 border-double border-[#1a5f6f] pt-6">
        <h1 className={TITULO_CLASS}>{c.anexo.titulo}</h1>
        <p className="mt-2 text-center text-sm text-slate-800">
          <Segments segments={c.anexo.subtitulo} />
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-slate-800 sm:grid-cols-2">
          {c.anexo.resumen.map((r) => (
            <div key={r.etiqueta}>
              <dt className="inline">{r.etiqueta}: </dt>
              <dd className="inline">
                <Segments segments={r.valor} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-base font-bold text-[#1a5f6f]">
          {c.anexo.cftea.etiqueta}: <span className="text-black">{c.anexo.cftea.valor}</span>
        </p>

        {c.anexo.filas.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs text-slate-800">
              <thead>
                <tr className="bg-[#1a5f6f] text-white">
                  {c.anexo.columnas.map((col) => (
                    <th key={col} className="border border-[#c3dadb] px-2 py-1.5 text-center font-bold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.anexo.filas.map((fila) => (
                  <tr key={fila[0]}>
                    {fila.map((valor, i) => (
                      <td key={i} className={`border border-[#c3dadb] px-2 py-1.5 text-center ${i > 0 ? "font-bold text-black" : ""}`}>
                        {valor}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-bold text-black">
                  {c.anexo.totales.map((valor, i) => (
                    <td key={i} className="border border-[#c3dadb] px-2 py-1.5 text-center">
                      {valor}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <Firmas bloques={c.anexo.firmas} />
      </div>

      <div className="mt-10 border-t-4 border-double border-[#1a5f6f] pt-6">
        <h1 className={TITULO_CLASS}>{c.pagare.titulo}</h1>
        <p className="mt-2 text-center text-sm text-slate-800">{c.pagare.subtitulo}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-slate-800">
          <Segments segments={c.pagare.encabezado} />
        </p>
        <p className="mt-1 text-sm text-slate-800">
          <Segments segments={c.pagare.por} />
        </p>

        <p className="mt-4 whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
          <Segments segments={c.pagare.cuerpo} />
        </p>
        <p className="mt-3 whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
          <Segments segments={c.pagare.valor} />
        </p>
        <p className="mt-3 whitespace-pre-wrap text-left text-sm sm:text-justify leading-relaxed text-slate-800">
          <Segments segments={c.pagare.lugarFecha} />
        </p>

        <div className="mt-12 flex flex-col text-sm text-slate-800" style={{ gap: 37 }}>
          <p className="font-semibold text-[#1a5f6f]">
            {c.pagare.firmanteLabel} {LINEA_NOMBRE}
          </p>
          <p>
            Nombre y apellido: <strong className={DATO_CLASS}>{c.pagare.nombre || LINEA_NOMBRE}</strong>
          </p>
          <p>
            DNI N°: <strong className={DATO_CLASS}>{c.pagare.documento || LINEA_DNI}</strong>
          </p>
          <p>
            Domicilio: <strong className={DATO_CLASS}>{c.pagare.domicilio || LINEA_NOMBRE}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
