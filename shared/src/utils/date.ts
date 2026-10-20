/**
 * Retorna la fecha actual en zona horaria de Argentina (America/Argentina/Buenos_Aires)
 * en formato ISO 'YYYY-MM-DD'.
 *
 * Evita desfasajes con UTC después de las 21:00 hs ART (donde UTC pasa al día siguiente),
 * alineándose de forma idéntica con la función de PostgreSQL `private.hoy_ar()`.
 */
export function getTodayArgentina(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
