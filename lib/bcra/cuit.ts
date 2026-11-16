/** Solo los dígitos: "20-36315016-1" -> "20363150161". */
export function soloDigitosCuit(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** "20363150161" -> "20-36315016-1" (mientras se escribe, agrega los guiones que corresponden). */
export function formatearCuit(valor: string): string {
  const d = soloDigitosCuit(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/** Valida el dígito verificador de un CUIT / CUIL / CDI (módulo 11). Recibe solo dígitos. */
export function cuitValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
  const verificador = Number(digitos[10]);
  const calculado = 11 - (suma % 11);
  if (calculado === 11) return verificador === 0;
  // Cuando da 10 no hay dígito posible: AFIP/ARCA asigna otro prefijo, con 9 o 4 como verificador.
  if (calculado === 10) return verificador === 9 || verificador === 4;
  return verificador === calculado;
}
