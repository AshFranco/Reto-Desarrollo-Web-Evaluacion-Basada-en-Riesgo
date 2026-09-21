import { getPendientes, marcarEnviada, marcarError, marcarFalloDeRed, reactivarFallidas } from './queue';
import { isTokenValid, getSession } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';
import type { OperacionPendiente } from '@/lib/db';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

const POLL_INTERVAL_MS = 30_000;

/**
 * Extraído como función pura testeable aparte: en el entorno de pruebas
 * (jsdom + MSW/undici) el FormData no se serializa con el boundary
 * multipart real al pasar por un fetch() interceptado, así que no se puede
 * verificar su contenido inspeccionando la petición HTTP recibida (mismo
 * límite documentado en useEvidencias.test.tsx). Se testea construyendo el
 * FormData directo y leyendo sus campos con .get(), sin red de por medio.
 */
export function construirFormEvidencia(payload: Record<string, unknown>): FormData {
  const form = new FormData();
  form.append('evaluacionId', (payload['evaluacionId'] as string) ?? '');
  if (payload['respuestaItemId']) form.append('respuestaItemId', payload['respuestaItemId'] as string);
  form.append('tipo', (payload['tipo'] as string) ?? 'FOTO');
  if (payload['latitud'] !== undefined && payload['latitud'] !== null) {
    form.append('latitud', String(payload['latitud']));
  }
  if (payload['longitud'] !== undefined && payload['longitud'] !== null) {
    form.append('longitud', String(payload['longitud']));
  }
  if (payload['blob'] instanceof Blob) {
    form.append('archivo', payload['blob'] as Blob, (payload['nombreArchivo'] as string) ?? 'archivo');
  }
  return form;
}

/** Fallo de red (sin conexión o timeout): no cuenta contra el límite de reintentos. */
class ErrorDeRed extends Error {}

export class SyncProcessor {
  private ejecucionActiva: Promise<void> | null = null;
  private intervaloId?: ReturnType<typeof setInterval>;
  private readonly proximoIntento = new Map<string, number>();
  private readonly handleOnline = () => void this.procesarCola();

  calcularBackoff(intentos: number): number {
    return Math.min(Math.pow(2, intentos) * 1000, 300_000);
  }

  private async fetchConTimeout(url: string, init: RequestInit, timeoutMs = 10_000): Promise<Response> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ErrorDeRed('Tiempo de espera agotado (timeout de red)')), timeoutMs);
    });
    try {
      return await Promise.race([fetch(url, init), timeoutPromise]);
    } catch (e) {
      throw e instanceof ErrorDeRed ? e : new ErrorDeRed(e instanceof Error ? e.message : 'error de red');
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  async procesarCola(forzar = false): Promise<void> {
    if (forzar) {
      this.proximoIntento.clear();
    }
    if (this.ejecucionActiva) {
      if (!forzar) return this.ejecucionActiva;
      await this.ejecucionActiva;
      return this.procesarCola(true);
    }

    this.ejecucionActiva = this.ejecutarCiclo(forzar);
    try {
      await this.ejecucionActiva;
    } finally {
      this.ejecucionActiva = null;
    }
  }

  private async ejecutarCiclo(forzar: boolean): Promise<void> {
    try {
      // El ciclo automático no gasta intentos cuando el navegador ya sabe que no hay red.
      if (!forzar && typeof navigator !== 'undefined' && navigator.onLine === false) return;

      if (!(await isTokenValid())) {
        await silentRefresh().catch(() => false);
      }

      // Sincronizar a mano (o al volver internet) reintenta también lo que agotó sus intentos.
      if (forzar) await reactivarFallidas();

      const pendientes = await getPendientes();
      if (pendientes.length === 0) return;

      const ahora = Date.now();
      const listos = forzar
        ? pendientes
        : pendientes.filter(op => {
            if (op.intentos === 0) return true;
            const next = this.proximoIntento.get(op.uuidLocal);
            return !next || ahora >= next;
          });
      if (listos.length === 0) return;

      const sesion = await getSession();
      if (!sesion) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sesion.accessToken}`,
      };

      for (const op of listos) {
        await this.ejecutarOperacion(op, headers);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync:actualizado'));
      }
    } catch {
      // Registrado por operación individual
    }
  }

  private async ejecutarOperacion(op: OperacionPendiente, headers: Record<string, string>): Promise<void> {
    const payload = op.payload as Record<string, unknown>;
    const evalId = payload['evaluacionServerId'] as string | undefined;

    try {
      let res: Response;

      if (op.tipo === 'INICIAR_EVALUACION' && evalId) {
        res = await this.fetchConTimeout(`${API_BASE}/api/v1/evaluaciones/${evalId}/iniciar`, { method: 'POST', headers });
      } else if (op.tipo === 'RESPUESTAS' && evalId) {
        res = await this.fetchConTimeout(`${API_BASE}/api/v1/evaluaciones/${evalId}/respuestas`, {
          method: 'POST', headers,
          body: JSON.stringify({ respuestas: payload['respuestas'] ?? [] }),
        });
      } else if (op.tipo === 'EVIDENCIA') {
        const authHeader = headers['Authorization'];
        res = await this.fetchConTimeout(`${API_BASE}/api/v1/evidencias`, {
          method: 'POST',
          headers: authHeader ? { Authorization: authHeader } : undefined,
          body: construirFormEvidencia(payload),
        });
      } else if (op.tipo === 'FINALIZAR_EVALUACION' && evalId) {
        res = await this.fetchConTimeout(`${API_BASE}/api/v1/evaluaciones/${evalId}/finalizar`, {
          method: 'POST', headers,
          body: JSON.stringify({ observacionesFinales: payload['observacionesFinales'] }),
        });
      } else if (op.tipo === 'GENERAR_INFORME' && evalId) {
        res = await this.fetchConTimeout(`${API_BASE}/api/v1/informes`, {
          method: 'POST', headers,
          body: JSON.stringify({ evaluacionId: evalId }),
        });
      } else {
        await marcarError(op.uuidLocal, 'tipo desconocido o falta evaluacionServerId');
        return;
      }

      if (res.ok) {
        await marcarEnviada(op.uuidLocal);
        this.proximoIntento.delete(op.uuidLocal);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sync:actualizado', { detail: { tipo: op.tipo, evalId } }));
        }
      } else {
        await marcarError(op.uuidLocal, `HTTP ${res.status}`);
        this.proximoIntento.set(op.uuidLocal, Date.now() + this.calcularBackoff(op.intentos + 1));
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'error de red';
      if (e instanceof ErrorDeRed) await marcarFalloDeRed(op.uuidLocal, mensaje);
      else await marcarError(op.uuidLocal, mensaje);
      this.proximoIntento.set(op.uuidLocal, Date.now() + this.calcularBackoff(op.intentos + 1));
    }
  }

  iniciar(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) void this.procesarCola();
    this.intervaloId = setInterval(() => void this.procesarCola(), POLL_INTERVAL_MS);
  }

  detener(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
    if (this.intervaloId !== undefined) {
      clearInterval(this.intervaloId);
      this.intervaloId = undefined;
    }
  }
}

export const syncProcessor = new SyncProcessor();
