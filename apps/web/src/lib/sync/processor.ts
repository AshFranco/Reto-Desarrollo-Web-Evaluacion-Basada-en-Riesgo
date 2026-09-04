import { getPendientes, marcarEnviada, marcarError } from './queue';
import { isTokenValid, getSession } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';
import type { OperacionPendiente } from '@/lib/db';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class SyncProcessor {
  private procesando = false;

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

      const sesion = await getSession();
      if (!sesion) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sesion.accessToken}`,
      };

      for (const op of pendientes) {
        await this.ejecutarOperacion(op, headers);
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
        const { Authorization } = headers;
        res = await fetch(`${API_BASE}/api/v1/evidencias`, {
          method: 'POST',
          headers: { Authorization },
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
      } else {
        await marcarError(op.uuidLocal, `HTTP ${res.status}`);
      }
    } catch (e) {
      await marcarError(op.uuidLocal, e instanceof Error ? e.message : 'error de red');
    }
  }

  iniciar(): void {
    window.addEventListener('online', () => void this.procesarCola());
    if (navigator.onLine) void this.procesarCola();
  }

  detener(): void { /* limpieza futura */ }
}
