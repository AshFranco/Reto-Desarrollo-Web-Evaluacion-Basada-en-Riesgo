import { useCallback, useEffect, useState } from 'react';
import { db, type OperacionPendiente } from '@/lib/db';

export interface RespuestaEncolada {
  itemId: string;
  codigoOpcion: 'C' | 'CP' | 'IT' | 'N/A';
  nivelCriticidad?: 'C' | 'M' | 'Me';
  observacion?: string;
}

/**
 * Lee las operaciones de la cola de sincronización (cola_sync) que
 * pertenecen a una evaluación puntual. useSyncStatus() ya cuenta cuántas
 * operaciones hay pendientes en TODA la cola, pero no distingue por
 * evaluación ni expone las que llegaron a estado 'error' tras agotar los
 * reintentos (hasta 10, ver sync/queue.ts) -- eso es justo lo que faltaba
 * en el intento anterior (PR #11) y causaba que una respuesta se perdiera
 * en silencio. Este hook sí las expone, para poder mostrárselas al técnico.
 */
export function useSincronizacionEvaluacion(evaluacionId: string | undefined) {
  const [operaciones, setOperaciones] = useState<OperacionPendiente[]>([]);

  const refrescar = useCallback(async () => {
    if (!evaluacionId) {
      setOperaciones([]);
      return;
    }
    const todas = await db.cola_sync.where('estado').anyOf('pendiente', 'enviando', 'error').toArray();
    setOperaciones(
      todas
        .filter((op) => (op.payload as Record<string, unknown>).evaluacionServerId === evaluacionId)
        // Orden ascendente por timestamp: al armar respuestasEncoladasPorItem
        // más abajo, la última que pisa el Map debe ser la más reciente.
        .sort((a, b) => a.timestamp - b.timestamp)
    );
  }, [evaluacionId]);

  useEffect(() => {
    void refrescar();
    const id = setInterval(refrescar, 5_000);
    return () => clearInterval(id);
  }, [refrescar]);

  const pendientes = operaciones.filter((o) => o.estado === 'pendiente' || o.estado === 'enviando');
  const errores = operaciones.filter((o) => o.estado === 'error');

  /**
   * Última respuesta encolada localmente (todavía no confirmada por el
   * servidor) para cada criterio, tomada de las operaciones RESPUESTAS
   * pendientes o en error -- para poder mostrar en pantalla lo que el
   * técnico ya respondió aunque no haya conexión, y para que "Finalizar"
   * cuente estos criterios como respondidos igual que los ya confirmados.
   */
  const respuestasEncoladasPorItem = new Map<string, RespuestaEncolada>();
  for (const op of operaciones) {
    if (op.tipo !== 'RESPUESTAS') continue;
    const respuestas = (op.payload as Record<string, unknown>).respuestas as RespuestaEncolada[] | undefined;
    for (const r of respuestas ?? []) {
      respuestasEncoladasPorItem.set(r.itemId, r);
    }
  }

  return { operaciones, pendientes, errores, respuestasEncoladasPorItem, refrescar };
}
