import { requirePageAccess } from "@/lib/auth/guards";
import { isRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { UsuariosPanel } from "@/components/usuarios/UsuariosPanel";
import type { EmpresaInfo, InvitacionPendiente, Miembro } from "@/lib/usuarios/tipos";

export default async function UsuariosPage() {
  // Solo el superadministrador: se verifica acá (el layout no se vuelve a ejecutar al navegar) y la
  // base de datos lo vuelve a exigir con RLS (profiles e invitations solo se leen siendo el principal).
  const session = await requirePageAccess("usuarios:gestionar");

  if (session.mock) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-brand">Usuarios y permisos</h1>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Modo demo: esta pantalla necesita la conexión con Supabase. Con el proyecto conectado se ven y se
          administran los usuarios reales.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [tenantRes, miembrosRes, invitacionesRes] = await Promise.all([
    supabase.from("tenants").select("name, owner_id").eq("id", session.tenant.id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, email, full_name, role, active, created_at")
      .eq("tenant_id", session.tenant.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, email, role, created_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const error = tenantRes.error ?? miembrosRes.error ?? invitacionesRes.error;
  if (error) console.error("[usuarios] No se pudieron leer los datos:", error.message);

  const empresa: EmpresaInfo = {
    nombre: tenantRes.data?.name ?? session.tenant.name,
    principalId: tenantRes.data?.owner_id ?? null,
  };
  const miembros: Miembro[] = (miembrosRes.data ?? [])
    .filter((m) => isRole(m.role))
    .map((m) => ({
      id: m.id,
      email: m.email,
      nombre: m.full_name,
      rol: m.role as Miembro["rol"],
      activo: m.active,
      desde: m.created_at,
    }));
  const invitaciones: InvitacionPendiente[] = (invitacionesRes.data ?? [])
    .filter((i) => isRole(i.role))
    .map((i) => ({ id: i.id, email: i.email, rol: i.role as InvitacionPendiente["rol"], creada: i.created_at }));

  return (
    <UsuariosPanel
      empresa={empresa}
      miembros={miembros}
      invitaciones={invitaciones}
      yoId={session.userId}
      errorCarga={error ? "No se pudieron cargar todos los datos. Recargá la página." : null}
    />
  );
}
