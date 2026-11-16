import type { Cotizacion } from "@/lib/cotizador/calcular";
import { MODALIDADES } from "@/lib/cotizador/config";

const numero1 = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numero0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "$300.000" (sin espacio): así sale en el mensaje de WhatsApp. */
export const pesosMensaje = (n: number) => `$${numero0.format(Math.round(n))}`;

/** "$ 300.000" (con espacio): así se ve en pantalla. */
export const pesosPantalla = (n: number) => `$ ${numero0.format(Math.round(n))}`;

/** Fracción a porcentaje con un decimal: 0,987 -> "98,7%"; null -> "—". */
export const porcentaje1 = (fraccion: number | null) => (fraccion === null ? "—" : `${numero1.format(fraccion * 100)}%`);

/**
 * Interés de la línea "📈 Interés": hasta un decimal y sin ",0" final, como el Excel (40% · 56% · 98,7%).
 * El Excel redondea a un decimal y lo escribe como texto, así que no lleva separador de miles.
 */
export const porcentajeInteresMensaje = (fraccion: number) => `${String(Math.round(fraccion * 1000) / 10).replace(".", ",")}%`;

/** Fracción a porcentaje sin decimales: 84,07 -> "8.407%"; null -> "—". */
export const porcentaje0 = (fraccion: number | null) => (fraccion === null ? "—" : `${numero0.format(fraccion * 100)}%`);

/** "2026-12-06" -> "6 de diciembre" */
export function diaYMes(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/**
 * Mensaje de WhatsApp con la cotización de un préstamo, con el mismo texto que arma el Excel del cotizador.
 * Usa el formato de WhatsApp: *negrita* y emojis.
 */
export function mensajeCotizacion(c: Cotizacion): string {
  const { unidad, label } = MODALIDADES[c.modalidad];
  const plazo = `${c.cuotas} ${unidad[c.cuotas === 1 ? 0 : 1]}`;
  const pagos = `${c.cuotas} ${c.cuotas === 1 ? "pago" : "pagos"} de ${pesosMensaje(c.valorCuota)}`;

  return [
    "*Préstamo*",
    "",
    `💰 Monto: ${pesosMensaje(c.monto)}`,
    `📈 Interés: ${porcentajeInteresMensaje(c.interes)}`,
    `📅 Plazo: ${plazo}`,
    `💵 Total a devolver: ${pesosMensaje(c.totalAPagar)}`,
    `🗓️ Cuota ${label.toLowerCase()}: ${pesosMensaje(c.valorCuota)}`,
    "",
    "📊 *Tasas:*",
    `TNA: ${porcentaje1(c.tna)}`,
    `TEA: ${porcentaje1(c.tea)}`,
    `TEM: ${porcentaje1(c.tem)}`,
    `CFT (efectivo anual): ${porcentaje1(c.cft)}`,
    "",
    c.cuotas === 1 ? "📆 *Pago:*" : "📆 *Pagos:*",
    ...c.cronograma.map((p) => `* ${diaYMes(p.fecha)}: ${pesosMensaje(p.monto)}`),
    "",
    `*${pagos}.*`,
  ].join("\n");
}

/**
 * Número de WhatsApp para un celular argentino escrito como "código de área + número, sin 0 ni 15"
 * ("11 7353-9985" -> "5491173539985"). También acepta que ya venga con el prefijo 54 / 549.
 * Devuelve null si no parece un celular válido.
 */
export function numeroWhatsApp(celular: string): string | null {
  let digitos = celular.replace(/\D/g, "");
  if (digitos.startsWith("549") && digitos.length === 13) return digitos;
  if (digitos.startsWith("54") && digitos.length === 12) return `549${digitos.slice(2)}`;
  digitos = digitos.replace(/^0/, "");
  return digitos.length === 10 ? `549${digitos}` : null;
}

/** Codifica el texto como ENCODEURL del Excel: todo menos letras, números y - . _ ~ (también `*`, `!`, `'`, `(` y `)`). */
function codificarTexto(texto: string): string {
  return encodeURIComponent(texto).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Enlace que abre el chat de WhatsApp (app de escritorio) con el mensaje ya escrito, igual al del Excel. */
export function enlaceWhatsApp(numero: string, mensaje: string): string {
  return `https://api.whatsapp.com/send?phone=${numero}&text=${codificarTexto(mensaje)}`;
}

/** Igual que el anterior, pero abre WhatsApp Web (para una computadora sin la app). */
export function enlaceWhatsAppWeb(numero: string, mensaje: string): string {
  return `https://web.whatsapp.com/send?phone=${numero}&text=${codificarTexto(mensaje)}`;
}
