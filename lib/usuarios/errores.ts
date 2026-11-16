import { NextResponse } from "next/server";

/**
 * Traduce el error de una función SQL de administración (invite_member, set_member_role, ...)
 * a una respuesta HTTP. Los mensajes con estos códigos los escribimos nosotros en schema.sql,
 * así que se pueden mostrar tal cual; cualquier otro error se oculta detrás de un mensaje genérico.
 */
export function respuestaDeError(error: { code?: string; message?: string }) {
  switch (error.code) {
    case "42501": // sin permiso
      return NextResponse.json({ error: error.message || "No tenés permiso para esta acción." }, { status: 403 });
    case "22023": // dato no válido (dominio no autorizado)
    case "23505": // ya existe / ya pertenece a un tenant
    case "23514": // regla de negocio (ej.: usuario principal, último administrador)
      return NextResponse.json({ error: error.message || "No se pudo completar la acción." }, { status: 409 });
    default:
      console.error("[usuarios] Error inesperado:", error.code, error.message);
      return NextResponse.json({ error: "No se pudo completar la operación. Probá de nuevo." }, { status: 500 });
  }
}
