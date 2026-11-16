import { requirePageAccess } from "@/lib/auth/guards";
import { obtenerTasas } from "@/lib/data/tasas";
import { TasasPanel } from "@/components/tasas/TasasPanel";

export default async function TasasPage() {
  // Las tasas son de uso interno: solo los administradores las ven (se verifica acá, no sólo en el menú).
  await requirePageAccess("tasas:ver");
  const tasas = await obtenerTasas();
  return <TasasPanel tasas={tasas} />;
}
