"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ROLES, ROLE_DESCRIPTION, ROLE_LABEL, SUPERADMIN_LABEL, type Role } from "@/lib/auth/roles";
import { CardLateral, ColumnaLateral } from "@/components/layout/CardLateral";
import { Select } from "@/components/ui/Select";
import type { EmpresaInfo, InvitacionPendiente, Miembro } from "@/lib/usuarios/tipos";

const OPCIONES_ROL = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const inicial = (m: { nombre: string | null; email: string }) => ((m.nombre ?? m.email).trim().charAt(0) || "?").toUpperCase();

const COLOR_ROL: Record<Role | "superadmin", string> = {
  superadmin: "bg-brand text-white",
  admin: "bg-brand-soft text-brand ring-1 ring-brand-border",
  operador: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  lectura: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#6ACEC6]/40 disabled:opacity-60";

function Seccion({ titulo, derecha, children }: { titulo: string; derecha?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-brand-border bg-white">
      <div className="flex items-center justify-between gap-3 bg-brand px-5 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white">{titulo}</h2>
        {derecha && <span className="text-xs font-medium text-white/80">{derecha}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InsigniaRol({ rol, principal }: { rol: Role; principal: boolean }) {
  const clave = principal ? "superadmin" : rol;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ROL[clave]}`}>
      {principal ? SUPERADMIN_LABEL : ROLE_LABEL[rol]}
    </span>
  );
}

function InsigniaEstado({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
      Desactivado
    </span>
  );
}

function Avatar({ m, grande = false }: { m: { nombre: string | null; email: string }; grande?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#6ACEC6] font-bold text-[#0f3f4d] ${
        grande ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm"
      }`}
    >
      {inicial(m)}
    </span>
  );
}

export function UsuariosPanel({
  empresa,
  miembros,
  invitaciones,
  yoId,
  errorCarga,
}: {
  empresa: EmpresaInfo;
  miembros: Miembro[];
  invitaciones: InvitacionPendiente[];
  yoId: string;
  errorCarga: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Role>("operador");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(errorCarga);
  const [aviso, setAviso] = useState<string | null>(null);

  const principal = miembros.find((m) => m.id === empresa.principalId) ?? null;
  // El principal primero; después, por antigüedad.
  const ordenados = [...miembros].sort((a, b) => Number(b.id === empresa.principalId) - Number(a.id === empresa.principalId));
  const otros = ordenados.filter((m) => m.id !== empresa.principalId);

  async function llamar(clave: string, url: string, metodo: "POST" | "PATCH" | "DELETE", cuerpo?: unknown) {
    setError(null);
    setAviso(null);
    setOcupado(clave);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la operación.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("No se pudo conectar. Revisá tu conexión y probá de nuevo.");
      return false;
    } finally {
      setOcupado(null);
    }
  }

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    const destino = email.trim().toLowerCase();
    if (await llamar("invitar", "/api/usuarios/invitar", "POST", { email: destino, rol })) {
      setAviso(
        `Invitación creada para ${destino} como ${ROLE_LABEL[rol].toLowerCase()}. Avisale que se registre en ${window.location.origin}/login con ese mismo email y confirme el correo que le llega.`
      );
      setEmail("");
    }
  }

  function cambiarRol(m: Miembro, nuevo: Role) {
    if (nuevo === m.rol) return;
    void llamar(`rol-${m.id}`, `/api/usuarios/${m.id}`, "PATCH", { rol: nuevo });
  }

  function alternarEstado(m: Miembro) {
    if (m.activo && !window.confirm(`¿Desactivar a ${m.nombre ?? m.email}? Pierde el acceso al instante; sus legajos y contratos quedan guardados.`)) {
      return;
    }
    void llamar(`estado-${m.id}`, `/api/usuarios/${m.id}`, "PATCH", { activo: !m.activo });
  }

  function quitarInvitacion(i: InvitacionPendiente) {
    if (!window.confirm(`¿Eliminar la invitación de ${i.email}?`)) return;
    void llamar(`inv-${i.id}`, `/api/usuarios/invitaciones/${i.id}`, "DELETE");
  }

  const selectorRol = (m: Miembro) => (
    <Select
      ariaLabel={`Rol de ${m.nombre ?? m.email}`}
      value={m.rol}
      disabled={ocupado !== null}
      onChange={(r) => cambiarRol(m, r)}
      opciones={OPCIONES_ROL}
    />
  );

  const botonEstado = (m: Miembro) => (
    <button
      type="button"
      onClick={() => alternarEstado(m)}
      disabled={ocupado !== null}
      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
        m.activo
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {m.activo ? "Desactivar" : "Activar"}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">Usuarios y permisos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Quién tiene acceso a la plataforma y qué puede hacer. Solo el superadministrador ve esta pantalla.
        </p>
      </div>

      {/* El contenido y la columna derecha arrancan a la misma altura. */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
    <div className="min-w-0 flex-1 space-y-6">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {aviso}
        </p>
      )}

      <Seccion titulo="Empresa y usuario principal">
        {/* En pantallas anchas: datos a la izquierda, la empresa justo en el centro de la tarjeta y la insignia a la derecha. */}
        <div className="grid items-center gap-x-6 gap-y-3 rounded-lg bg-brand-soft p-3 sm:grid-cols-[1fr_auto_1fr]">
          {principal ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar m={principal} grande />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">{principal.nombre ?? principal.email}</p>
                  <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{principal.email}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Miembro desde {fecha(principal.desde)}
                    {principal.id === yoId && " · Sos vos"}
                  </p>
                </div>
              </div>
              <div className="sm:text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</p>
                <p className="text-lg font-bold text-slate-900">{empresa.nombre}</p>
              </div>
              <div className="sm:justify-self-end">
                <InsigniaRol rol={principal.rol} principal />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Todavía no hay un usuario principal definido para esta empresa.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">{ROLE_DESCRIPTION.superadmin}</p>
      </Seccion>

      <Seccion titulo="Invitar usuario">
        <form onSubmit={invitar} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <div>
            <label htmlFor="inv-email" className="block text-sm font-semibold text-slate-900">
              Email
            </label>
            <input
              id="inv-email"
              type="email"
              required
              autoComplete="off"
              placeholder="nombre@ezmel.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="inv-rol" className="block text-sm font-semibold text-slate-900">
              Rol
            </label>
            <Select id="inv-rol" value={rol} onChange={setRol} opciones={OPCIONES_ROL} className="mt-1" />
          </div>
          <button
            type="submit"
            disabled={ocupado !== null}
            className="min-h-11 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-hover disabled:opacity-60"
          >
            {ocupado === "invitar" ? "Invitando..." : "Invitar"}
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Solo se pueden invitar emails de dominios autorizados. La plataforma no envía un mail propio: la persona se
          registra con ese mismo email, confirma el correo que le manda Supabase y entra con el rol elegido.
        </p>
      </Seccion>

      <Seccion titulo="Otros usuarios" derecha={`${otros.length} ${otros.length === 1 ? "usuario" : "usuarios"}`}>
        {otros.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Todavía no hay otros usuarios. Invitá a alguien del equipo con el formulario de arriba.
          </p>
        ) : (
          <>
            {/* Hasta pantallas muy anchas (la columna derecha le quita lugar a la tabla): una tarjeta por usuario. */}
            <ul className="space-y-3 2xl:hidden">
              {otros.map((m) => (
                <li key={m.id} className="rounded-lg border border-brand-border p-3">
                  <div className="flex items-start gap-3">
                    <Avatar m={m} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-slate-900">{m.nombre ?? "Sin nombre"}</p>
                      <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{m.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <InsigniaRol rol={m.rol} principal={false} />
                    <InsigniaEstado activo={m.activo} />
                    <span className="text-xs text-slate-500">Desde {fecha(m.desde)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{ROLE_DESCRIPTION[m.rol]}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectorRol(m)}
                    {botonEstado(m)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto 2xl:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Usuario</th>
                    <th className="px-3 py-2.5 font-semibold">Rol</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                    <th className="px-3 py-2.5 font-semibold">Miembro desde</th>
                    <th className="px-3 py-2.5 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {otros.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar m={m} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{m.nombre ?? "Sin nombre"}</p>
                            <p className="text-slate-600">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-44">{selectorRol(m)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <InsigniaEstado activo={m.activo} />
                      </td>
                      <td className="px-3 py-3 text-slate-700">{fecha(m.desde)}</td>
                      <td className="px-3 py-3">{botonEstado(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Seccion>

      <Seccion titulo="Invitaciones pendientes" derecha={`${invitaciones.length}`}>
        {invitaciones.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {invitaciones.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{i.email}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <InsigniaRol rol={i.rol} principal={false} />
                    Invitado el {fecha(i.creada)} · todavía no se registró
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitarInvitacion(i)}
                  disabled={ocupado !== null}
                  className="min-h-11 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

    </div>

      {/* Columna derecha (al final del contenido en pantallas chicas): qué puede hacer cada tipo de usuario. */}
      <ColumnaLateral>
        <CardLateral titulo="Qué puede hacer cada tipo de usuario">
          <dl className="space-y-4">
            {(["superadmin", ...ROLES] as const).map((clave) => (
              <div key={clave} className="space-y-1.5">
                <dt>
                  <InsigniaRol rol={clave === "superadmin" ? "admin" : clave} principal={clave === "superadmin"} />
                </dt>
                <dd className="text-sm text-slate-700">{ROLE_DESCRIPTION[clave]}</dd>
              </div>
            ))}
          </dl>
        </CardLateral>
      </ColumnaLateral>
      </div>
    </div>
  );
}
