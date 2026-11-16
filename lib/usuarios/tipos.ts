import type { Role } from "@/lib/auth/roles";

/** Persona con cuenta en el tenant (fila de public.profiles). */
export interface Miembro {
  id: string;
  email: string;
  nombre: string | null;
  rol: Role;
  activo: boolean;
  /** ISO: cuándo se creó la cuenta. */
  desde: string;
}

/** Invitación pendiente (todavía no se registró con ese email). */
export interface InvitacionPendiente {
  id: string;
  email: string;
  rol: Role;
  /** ISO */
  creada: string;
}

export interface EmpresaInfo {
  nombre: string;
  /** Usuario principal (superadministrador). */
  principalId: string | null;
}
