/** Roles de la app. Tienen que coincidir con el enum `app_role` de supabase/schema.sql. */
export const ROLES = ["admin", "operador", "lectura"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  operador: "Operador",
  lectura: "Solo lectura",
};

/** El usuario principal del tenant (tenants.owner_id). En la base tiene rol admin; acá se muestra aparte. */
export const SUPERADMIN_LABEL = "Superadministrador";

/** Qué puede hacer cada tipo de usuario, para mostrarlo en la pantalla de usuarios. */
export const ROLE_DESCRIPTION: Record<Role | "superadmin", string> = {
  superadmin:
    "Usuario principal. Hace todo y es el único que ve a los demás usuarios, invita, cambia roles y activa o desactiva cuentas.",
  admin: "Trabaja con legajos, contratos y Central de deudores, y puede borrar documentos. No gestiona usuarios.",
  operador: "Crea y consulta legajos, contratos y Central de deudores. No borra documentos ni gestiona usuarios.",
  lectura: "Solo consulta. No genera ni descarga documentos nuevos ni gestiona usuarios.",
};

export type Permission = "documentos:leer" | "documentos:crear" | "usuarios:gestionar" | "tasas:ver";

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["documentos:leer", "documentos:crear", "tasas:ver"],
  operador: ["documentos:leer", "documentos:crear"],
  lectura: ["documentos:leer"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Qué puede hacer cada rol. La base de datos aplica las mismas reglas con RLS.
 * Gestionar usuarios no depende del rol sino de ser el usuario principal del tenant (`superAdmin`).
 */
export function can(role: Role | null | undefined, permission: Permission, superAdmin = false): boolean {
  if (!role) return false;
  if (permission === "usuarios:gestionar") return superAdmin;
  return PERMISSIONS[role].includes(permission);
}
