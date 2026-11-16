import type { Metadata } from "next";
import { DatosEzmel } from "@/components/solicitud/DatosEzmel";
import { Navbar } from "@/components/solicitud/Navbar";
import { SolicitudApp } from "@/components/solicitud/SolicitudApp";
import { leerParametros, PRESTAMO_INICIAL } from "@/lib/solicitud/parametros";

export const metadata: Metadata = {
  title: "Pedí tu préstamo · EzMel",
  description: "Requisitos, cotizador y cronograma de pagos de EzMel Servicios Financieros.",
  // El enlace se comparte de forma privada con cada cliente: que no aparezca en buscadores.
  robots: { index: false, follow: false },
};

/** Página pública (sin login ni menú lateral) que se le pasa al cliente después del filtro inicial. */
export default async function SolicitarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Al volver del formulario, el cotizador conserva el tipo y el plan elegidos.
  const { tipo, prestamo } = leerParametros(await searchParams);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-[960px] space-y-12 px-4 py-8">
        <DatosEzmel />
        <SolicitudApp tipoInicial={tipo} prestamoInicial={prestamo ?? PRESTAMO_INICIAL} />
      </main>
      <footer className="border-t border-brand-border bg-white py-6 text-center text-xs text-slate-500">
        EzMel Servicios Financieros · tu crecimiento es nuestro compromiso
      </footer>
    </div>
  );
}
