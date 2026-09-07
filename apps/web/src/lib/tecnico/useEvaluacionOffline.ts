import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync/queue';
import type { CatalogoItemLocal, RespuestaLocal } from '@/lib/db';

interface UseEvaluacionOfflineParams {
  asignacionId: string;
  evaluacionServerId: string;
}

interface EstadoEvaluacion {
  items: CatalogoItemLocal[];
  respuestas: Map<string, RespuestaLocal>;
  cargando: boolean;
  respondidos: number;
  evaluables: number;
  porcentajeAvance: number;
}

export function useEvaluacionOffline({ asignacionId, evaluacionServerId }: UseEvaluacionOfflineParams) {
  const uuidLocal = `eval-${asignacionId}`;

  const [estado, setEstado] = useState<EstadoEvaluacion>({
    items: [],
    respuestas: new Map(),
    cargando: true,
    respondidos: 0,
    evaluables: 0,
    porcentajeAvance: 0,
  });

  const cargar = useCallback(async () => {
    const [items, respuestasArr] = await Promise.all([
      db.catalogo_item.toArray(),
      db.respuesta.where('evaluacionUuid').equals(uuidLocal).toArray(),
    ]);

    const evaluables = items.filter((i) => i.esEvaluable);
    const respuestasMap = new Map(respuestasArr.map((r) => [r.itemId, r]));
    const respondidos = evaluables.filter((i) => respuestasMap.has(i.id)).length;

    setEstado({
      items: evaluables,
      respuestas: respuestasMap,
      cargando: false,
      respondidos,
      evaluables: evaluables.length,
      porcentajeAvance: evaluables.length > 0 ? Math.round((respondidos / evaluables.length) * 100) : 0,
    });
  }, [uuidLocal]);

  useEffect(() => {
    // Garantizar que el registro de evaluación existe en Dexie
    db.evaluacion.get(uuidLocal).then((ev) => {
      if (!ev) {
        return db.evaluacion.put({
          uuidLocal,
          evaluacionServerId,
          estado: 'en_progreso',
          creadaEn: Date.now(),
          modificadaEn: Date.now(),
        });
      }
    }).then(cargar);
  }, [uuidLocal, evaluacionServerId, cargar]);

  const responder = useCallback(async (
    itemId: string,
    codigoOpcion: 'C' | 'CP' | 'IT' | 'N/A',
    nivelCriticidad: 'C' | 'M' | 'Me' | null,
    observacion = '',
  ) => {
    const respuesta: RespuestaLocal = {
      uuidLocal: `resp-${uuidLocal}-${itemId}`,
      evaluacionUuid: uuidLocal,
      itemId,
      codigoOpcion,
      nivelCriticidad,
      observacion,
      capturaEn: Date.now(),
    };
    await db.respuesta.put(respuesta);
    await db.evaluacion.update(uuidLocal, { modificadaEn: Date.now() });
    await cargar();
  }, [uuidLocal, cargar]);

  const finalizar = useCallback(async (observacionesFinales = '') => {
    const respuestasArr = [...estado.respuestas.values()];
    await enqueue('RESPUESTAS', {
      evaluacionServerId,
      respuestas: respuestasArr.map((r) => ({
        uuidLocal: r.uuidLocal,
        itemId: r.itemId,
        codigoOpcion: r.codigoOpcion,
        nivelCriticidad: r.nivelCriticidad,
        observacion: r.observacion,
      })),
    });
    await enqueue('FINALIZAR_EVALUACION', { evaluacionServerId, observacionesFinales });
    await db.evaluacion.update(uuidLocal, { estado: 'finalizada', modificadaEn: Date.now() });
  }, [uuidLocal, evaluacionServerId, estado.respuestas]);

  return { ...estado, responder, finalizar };
}
