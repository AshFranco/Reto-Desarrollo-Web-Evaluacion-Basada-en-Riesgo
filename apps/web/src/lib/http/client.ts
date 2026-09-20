import { getSession, clearSession } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Se lanza cuando una petición sigue devolviendo 401 después de intentar
 * renovar la sesión. El llamador debe capturarla y redirigir a /login.
 */
export class SesionExpiradaError extends Error {
  constructor() {
    super('La sesión expiró. Inicie sesión nuevamente.');
    this.name = 'SesionExpiradaError';
  }
}

async function construirHeaders(init?: HeadersInit, body?: BodyInit | null): Promise<Headers> {
  const headers = new Headers(init);
  if (!headers.has('Content-Type') && typeof body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const sesion = await getSession();
  if (sesion) headers.set('Authorization', `Bearer ${sesion.accessToken}`);
  return headers;
}

/**
 * Cliente HTTP compartido para las pantallas nuevas. Agrega el Authorization
 * automáticamente y, si el servidor responde 401, intenta renovar la sesión
 * una sola vez con silentRefresh() antes de reintentar la petición original.
 *
 * NOTA: sync/processor.ts y catalogo/loader.ts NO usan este cliente todavía —
 * siguen armando sus propias cabeceras. Migrarlos es un cambio aparte, fuera
 * de esta tarea.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = await construirHeaders(init.headers, init.body);
  const respuesta = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (respuesta.status !== 401) return respuesta;

  const renovado = await silentRefresh();
  if (!renovado) {
    await clearSession();
    throw new SesionExpiradaError();
  }

  const headersReintento = await construirHeaders(init.headers, init.body);
  return fetch(`${API_BASE}${path}`, { ...init, headers: headersReintento });
}

/**
 * Igual que apiFetch, pero parsea la respuesta como JSON y lanza un Error
 * con el mensaje del backend si la respuesta no es 2xx — mismo criterio que
 * usa lib/auth/login.ts. Pensado para los hooks de React Query, que solo
 * necesitan datos u error, no el Response crudo.
 */
export async function apiFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const respuesta = await apiFetch(path, init);
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    let errorMsg = `Error en la petición (${respuesta.status})`;
    if (cuerpo?.message) {
      errorMsg = Array.isArray(cuerpo.message) ? cuerpo.message.join(' | ') : String(cuerpo.message);
    }
    throw new Error(errorMsg);
  }

  return cuerpo as T;
}
