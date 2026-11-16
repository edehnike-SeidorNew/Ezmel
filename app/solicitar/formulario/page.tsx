import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/solicitud/Navbar";
import { SolicitudPagina } from "@/components/solicitud/SolicitudPagina";
import { leerParametros } from "@/lib/solicitud/parametros";

export const metadata: Metadata = {
  title: "Completá tu solicitud · EzMel",
  description: "Formulario de solicitud de préstamo de EzMel Servicios Financieros.",
  robots: { index: false, follow: false },
};

/** Página pública con solo el formulario: el cliente llega desde el cotizador con el plan elegido. */
export default async function FormularioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tipo, prestamo } = leerParametros(await searchParams);
  // Sin un plan válido no hay nada que solicitar: se vuelve al cotizador.
  if (!prestamo) redirect("/solicitar");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-[960px] px-4 py-8">
        <SolicitudPagina tipoInicial={tipo} prestamo={prestamo} />
      </main>
      <footer className="border-t border-brand-border bg-white py-6 text-center text-xs text-slate-500">
        EzMel Servicios Financieros · tu crecimiento es nuestro compromiso
      </footer>
    </div>
  );
}
