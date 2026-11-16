"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "@/components/layout/icons";
import { cotizar } from "@/lib/cotizador/calcular";
import { MODALIDADES } from "@/lib/cotizador/config";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { leerLegajoPdf, PdfNoValidoError, type LegajoLeido } from "@/lib/legajo/leerPdf";
import { FILE_CATEGORIES } from "@/lib/types/legajo";
import { hoyISO } from "@/lib/solicitud/formulario";
import { LegajoWizard } from "./LegajoWizard";

const pesos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const money = (n: number) => `$ ${pesos.format(n)}`;

const ETIQUETA_CAMPO: Record<string, string> = {
  nombreApellido: "Nombre y apellido",
  dni: "DNI",
  nombre: "Nombre",
  apellido: "Apellido",
  telefono: "Teléfono",
  email: "Email",
  direccion: "Dirección",
  codigoPostal: "Código postal",
  referencia1: "Referencia 1",
  referencia2: "Referencia 2",
  referenciaLaboral: "Referencia laboral",
  montoPrestamo: "Monto de préstamo",
};

function Aviso({ tono, children }: { tono: "info" | "alerta" | "error"; children: React.ReactNode }) {
  const clase =
    tono === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tono === "alerta"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-brand-border bg-brand-soft text-slate-800";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${clase}`}>{children}</div>;
}

/** Lo que dice la solicitud del cliente, junto con las condiciones vigentes recalculadas (el PDF no es confiable). */
function ResumenSolicitud({ leido }: { leido: LegajoLeido }) {
  const sol = leido.payload.solicitud;
  if (!sol) return null;

  const { monto, modalidad, cuotas, valorCuota, total } = sol.prestamo;
  const oficial = cotizar(monto, modalidad, cuotas, hoyISO());
  const difiere = !oficial || oficial.valorCuota !== valorCuota || oficial.totalAPagar !== total;
  const plan = MODALIDADES[modalidad];

  return (
    <div className="space-y-3 rounded-xl border border-brand-border bg-white p-4 text-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-brand">Datos informados por el cliente</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Tipo</dt>
          <dd className="font-medium text-slate-900">
            {sol.tipo === "comercial"
              ? "Comercial"
              : `Personal – ${sol.subtipo === "monotributo" ? "Monotributista" : "Trabajador en blanco"}`}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Plan pedido</dt>
          <dd className="text-right font-medium text-slate-900">
            {money(monto)} en {cuotas} {cuotas === 1 ? plan.unidad[0] : plan.unidad[1]} ({plan.label.toLowerCase()})
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Cuota / total según el PDF</dt>
          <dd className="font-medium text-slate-900">
            {money(valorCuota)} / {money(total)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Cuota / total vigentes</dt>
          <dd className="font-semibold text-brand">
            {oficial ? `${money(oficial.valorCuota)} / ${money(oficial.totalAPagar)}` : "—"}
          </dd>
        </div>
        {sol.ingresosMensuales && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Ingresos mensuales estimados</dt>
            <dd className="font-medium text-slate-900">{sol.ingresosMensuales}</dd>
          </div>
        )}
        {sol.redes && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Redes sociales</dt>
            <dd className="font-medium text-slate-900">{sol.redes}</dd>
          </div>
        )}
      </dl>
      {difiere && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Los valores del PDF no coinciden con las condiciones vigentes. El PDF lo armó el dispositivo del cliente,
          así que tomá como válidos los vigentes.
        </p>
      )}
    </div>
  );
}

function Cargado({
  pdf,
  leido,
  onOtro,
}: {
  pdf: File;
  leido: LegajoLeido;
  onOtro: () => void;
}) {
  const url = useObjectUrl(pdf);
  const solicitud = leido.payload.origen === "solicitud-web";
  const documentos = FILE_CATEGORIES.reduce((n, c) => n + (leido.archivos[c.key]?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <Aviso tono="info">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              {solicitud ? "Solicitud enviada por el cliente" : "Legajo generado por la plataforma"}
            </p>
            <p className="text-xs text-slate-600">
              {pdf.name} · {leido.paginas} {leido.paginas === 1 ? "hoja" : "hojas"} · {documentos}{" "}
              {documentos === 1 ? "documento recuperado" : "documentos recuperados"}
            </p>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-2 hover:underline">
                Ver PDF original
              </a>
            )}
            <button type="button" onClick={onOtro} className="text-brand underline-offset-2 hover:underline">
              Cargar otro PDF
            </button>
          </div>
        </div>
      </Aviso>

      <Aviso tono="alerta">
        Revisá los datos contra la documentación antes de guardar. Se completaron con lo que trae el PDF; todo se puede
        editar.
        {solicitud && " Faltan los datos propios de la empresa: N.º de préstamo, fecha de apertura y responsable."}
      </Aviso>

      {leido.descartados.length > 0 && (
        <Aviso tono="alerta">
          Estos campos venían con un valor inválido y quedaron vacíos:{" "}
          {leido.descartados.map((c) => ETIQUETA_CAMPO[c] ?? c).join(", ")}.
        </Aviso>
      )}
      {leido.advertencias.map((texto) => (
        <Aviso key={texto} tono="alerta">
          {texto}
        </Aviso>
      ))}

      <ResumenSolicitud leido={leido} />

      {/* El formulario es el de "Crear legajo", ya completo: se revisa, se corrige y se guarda como siempre. */}
      <LegajoWizard inicial={{ values: leido.valores, files: leido.archivos }} />
    </div>
  );
}

type Estado =
  | { fase: "vacio" }
  | { fase: "leyendo"; mensaje: string }
  | { fase: "listo"; pdf: File; leido: LegajoLeido; clave: number }
  | { fase: "error"; mensaje: string };

/** Carga un legajo desde un PDF (el de la plataforma o la solicitud del cliente) para revisarlo y guardarlo. */
export function CargarLegajo() {
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ fase: "vacio" });
  const [arrastrando, setArrastrando] = useState(false);

  async function abrir(pdf: File | undefined) {
    if (!pdf) return;
    setEstado({ fase: "leyendo", mensaje: "Abriendo el PDF…" });
    try {
      const leido = await leerLegajoPdf(pdf, (mensaje) => setEstado({ fase: "leyendo", mensaje }));
      setEstado({ fase: "listo", pdf, leido, clave: Date.now() });
    } catch (error) {
      console.error(error);
      setEstado({
        fase: "error",
        mensaje:
          error instanceof PdfNoValidoError ? error.message : "No se pudo leer el PDF. Probá con otro archivo.",
      });
    }
  }

  if (estado.fase === "listo") {
    return <Cargado key={estado.clave} pdf={estado.pdf} leido={estado.leido} onOtro={() => setEstado({ fase: "vacio" })} />;
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          void abrir(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          arrastrando ? "border-brand bg-brand-soft" : "border-brand-border bg-white"
        }`}
      >
        <UploadIcon className="h-10 w-10 text-brand" />
        <div>
          <p className="text-base font-semibold text-slate-900">Elegí el PDF del legajo</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Puede ser el PDF que te mandó el cliente o un legajo generado por la plataforma. Se completan los datos y
            los documentos para que los revises antes de guardar.
          </p>
        </div>
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void abrir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={estado.fase === "leyendo"}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {estado.fase === "leyendo" ? estado.mensaje : "Elegir PDF"}
        </button>
        <p className="text-xs text-slate-500">O arrastralo hasta acá.</p>
      </div>

      {estado.fase === "error" && <Aviso tono="error">{estado.mensaje}</Aviso>}
    </div>
  );
}
