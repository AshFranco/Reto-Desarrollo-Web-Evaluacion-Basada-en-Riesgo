/**
 * Utilidades de fechas para el calendario del evaluador.
 *
 * Todo trabaja con "claves de día" (`YYYY-MM-DD`) y aritmética en UTC: el backend guarda `fechaProgramada`
 * como fecha sin hora (medianoche UTC), y convertirla a la zona horaria local la movería al día anterior
 * en América/Santo_Domingo. Por eso el día se toma siempre de los primeros 10 caracteres del ISO.
 */

export type Vista = 'dia' | 'semana' | 'mes';

const MS_DIA = 86_400_000;

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function aUtc(clave: string): number {
  const [anio, mes, dia] = clave.split('-').map(Number) as [number, number, number];
  return Date.UTC(anio, mes - 1, dia);
}

function formatoClave(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function deUtc(ms: number): string {
  const d = new Date(ms);
  return formatoClave(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Día (`YYYY-MM-DD`) de una fecha ISO del backend, sin pasar por la zona horaria local. */
export function claveDeFecha(fechaIso: string): string {
  return fechaIso.slice(0, 10);
}

/** Hoy según el reloj local del dispositivo (es lo que ve el técnico como "hoy"). */
export function hoyClave(): string {
  const d = new Date();
  return formatoClave(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function sumarDias(clave: string, dias: number): string {
  return deUtc(aUtc(clave) + dias * MS_DIA);
}

/** 0 = lunes … 6 = domingo. */
export function diaDeSemana(clave: string): number {
  return (new Date(aUtc(clave)).getUTCDay() + 6) % 7;
}

export function inicioSemana(clave: string): string {
  return sumarDias(clave, -diaDeSemana(clave));
}

export function inicioMes(clave: string): string {
  return `${clave.slice(0, 8)}01`;
}

export function finMes(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number) as [number, number, number];
  return formatoClave(anio, mes, new Date(Date.UTC(anio, mes, 0)).getUTCDate());
}

/** Suma meses conservando el día, o el último día del mes destino si no existe (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(clave: string, meses: number): string {
  const [anio, mes, dia] = clave.split('-').map(Number) as [number, number, number];
  const total = anio * 12 + (mes - 1) + meses;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = total % 12;
  const ultimo = new Date(Date.UTC(nuevoAnio, nuevoMes + 1, 0)).getUTCDate();
  return formatoClave(nuevoAnio, nuevoMes + 1, Math.min(dia, ultimo));
}

export function numeroDeDia(clave: string): number {
  return Number(clave.slice(8, 10));
}

export function mismoMes(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Rango de días que la vista necesita pedir al backend (la del mes incluye los días de relleno de las semanas parciales). */
export function rangoVisible(vista: Vista, ancla: string): { desde: string; hasta: string } {
  if (vista === 'dia') return { desde: ancla, hasta: ancla };
  if (vista === 'semana') {
    const desde = inicioSemana(ancla);
    return { desde, hasta: sumarDias(desde, 6) };
  }
  return { desde: inicioSemana(inicioMes(ancla)), hasta: sumarDias(inicioSemana(finMes(ancla)), 6) };
}

export function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
  return dias;
}

export function mover(vista: Vista, ancla: string, paso: -1 | 1): string {
  if (vista === 'dia') return sumarDias(ancla, paso);
  if (vista === 'semana') return sumarDias(ancla, paso * 7);
  return sumarMeses(ancla, paso);
}

const formato = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-DO', { ...opciones, timeZone: 'UTC' });

export function etiquetaPeriodo(vista: Vista, ancla: string): string {
  const fecha = new Date(aUtc(ancla));
  if (vista === 'mes') return formato({ month: 'long', year: 'numeric' }).format(fecha);
  if (vista === 'dia') return formato({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fecha);
  const { desde, hasta } = rangoVisible('semana', ancla);
  const a = new Date(aUtc(desde));
  const b = new Date(aUtc(hasta));
  if (mismoMes(desde, hasta)) {
    return `${a.getUTCDate()} – ${b.getUTCDate()} de ${formato({ month: 'long', year: 'numeric' }).format(b)}`;
  }
  const anioDistinto = desde.slice(0, 4) !== hasta.slice(0, 4);
  const corto = (f: Date, conAnio: boolean) => formato({ day: 'numeric', month: 'short', ...(conAnio ? { year: 'numeric' } : {}) }).format(f);
  return `${corto(a, anioDistinto)} – ${corto(b, true)}`;
}

/** "lunes, 21 de septiembre" para los encabezados de la vista de día. */
export function etiquetaDiaLarga(clave: string): string {
  return formato({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(aUtc(clave)));
}
