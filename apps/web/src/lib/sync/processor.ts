import { getPendientes, marcarEnviada, marcarError } from './queue';
import { isTokenValid, getSession } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';
import type { OperacionPendiente } from '@/lib/db';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const POLL_INTERVAL_MS = 30_000;

export class SyncProcessor {
  private procesando = false;
  private intervaloId?: ReturnType<typeof setInterval>;
  private readonly proximoIntento = new Map<string, number>();

  calcularBackoff(intentos: number): number {
    return Math.min(Math.pow(2, intentos) * 1000, 300_000);
  }

  async procesarCola(): Promise<void> {
    if (this.procesando) return;
    this.procesando = true;

    try {
      if (!(await isTokenValid())) {
        const ok = await silentRefresh();
        if (!ok) return;
      }

      const pendientes = await getPendientes();
      if (pendientes.length === 0) return;

      const ahora = Date.now();
      const listos = pendientes.filter(op => {
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
    } finally {
      this.procesando = false;
    }
  }

  private async ejecutarOperacion(op: OperacionPendiente, headers: Record<string, string>): Promise<void> {
    const payload = op.payload as Record<string, unknown>;
    const evalId = payload['evaluacionServerId'] as string | undefined;

    try {
      let res: Response;

      if (op.tipo === 'INICIAR_EVALUACION' && evalId) {
        res = await fetch(`${API_BASE}/api/v1/evaluaciones/${evalId}/iniciar`, { method: 'POST', headers });
      } else if (op.tipo === 'RESPUESTAS' && evalId) {
        res = await fetch(`${API_BASE}/api/v1/evaluaciones/${evalId}/respuestas`, {
          method: 'POST', headers,
          body: JSON.stringify({ respuestas: payload['respuestas'] ?? [] }),
        });
      } else if (op.tipo === 'EVIDENCIA') {
        const form = new FormData();
        form.append('evaluacionId', (payload['evaluacionId'] as string) ?? '');
        if (payload['respuestaItemId']) form.append('respuestaItemId', payload['respuestaItemId'] as string);
        form.append('tipo', 'FOTO');
        if (payload['blob'] instanceof Blob) form.append('archivo', payload['blob'] as Blob, payload['nombreArchivo'] as string);
        const authHeader = headers['Authorization'];
        res = await fetch(`${API_BASE}/api/v1/evidencias`, {
          method: 'POST',
          headers: authHeader ? { Authorization: authHeader } : undefined,
          body: form,
        });
      } else if (op.tipo === 'FINALIZAR_EVALUACION' && evalId) {
        res = await fetch(`${API_BASE}/api/v1/evaluaciones/${evalId}/finalizar`, {
          method: 'POST', headers,
          body: JSON.stringify({ observacionesFinales: payload['observacionesFinales'] }),
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
      await marcarError(op.uuidLocal, e instanceof Error ? e.message : 'error de red');
      this.proximoIntento.set(op.uuidLocal, Date.now() + this.calcularBackoff(op.intentos + 1));
    }
  }

  iniciar(): void {
    window.addEventListener('online', () => void this.procesarCola());
    if (navigator.onLine) void this.procesarCola();
    this.intervaloId = setInterval(() => void this.procesarCola(), POLL_INTERVAL_MS);
  }

  detener(): void {
    if (this.intervaloId !== undefined) {
      clearInterval(this.intervaloId);
      this.intervaloId = undefined;
    }
  }
}
