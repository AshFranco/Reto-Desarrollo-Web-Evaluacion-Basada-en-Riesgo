import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import { useCasosAsignados, ID_ESTADO_EVALUACION } from './useCasos';

export interface InformePendiente {
  casoId: string;
  evaluacionId: string;
  establecimiento: string;
  empresa: string;
}

/**
 * Deriva la lista de evaluaciones en revisión a partir de useCasosAsignados
 * (no existe un GET /informes ni un GET /evaluaciones que las liste para
 * Coordinador — confirmado en informes.controller.ts, que solo declara
 * POST y PATCH, sin ningún GET).
 */
export function useInformesPendientes() {
  const { data: casos, isLoading } = useCasosAsignados();

  const pendientes: InformePendiente[] = casos.flatMap((c) =>
    c.evaluaciones
      .filter((e) => e.idEstado === ID_ESTADO_EVALUACION.EN_REVISION)
      .map((e) => ({
        casoId: c.id,
        evaluacionId: e.id,
        establecimiento: c.establecimiento.nombre,
        empresa: c.establecimiento.empresa.razonSocial,
      }))
  );

  return { data: pendientes, isLoading };
}

export type AccionRevision = 'APROBAR' | 'DEVOLVER' | 'SOLICITAR_CORRECCION';

/**
 * PATCH /api/v1/informes/:evaluacionId/revisar — confirmado en vivo que el
 * backend solo distingue dos resultados: APROBAR -> Aprobada, y tanto
 * DEVOLVER como SOLICITAR_CORRECCION -> Devuelta (idéntico). El DTO acepta
 * las 3 acciones, así que se envían tal cual y la intención real queda
 * registrada en `observaciones`.
 */
export function useRevisarInforme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluacionId,
      accion,
      observaciones,
    }: {
      evaluacionId: string;
      accion: AccionRevision;
      observaciones?: string;
    }) =>
      apiFetchJson(`/api/v1/informes/${evaluacionId}/revisar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, observaciones }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
    },
  });
}
