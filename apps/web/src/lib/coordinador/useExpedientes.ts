import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { Expediente } from '@/lib/types';
import { useCasosAsignados, ID_ESTADO_EVALUACION } from './useCasos';

/**
 * GET /api/v1/expedientes — confirmado en vivo que solo devuelve
 * expedientes YA cerrados (ver nota en el tipo Expediente, lib/types.ts).
 * Sirve para el historial, no para saber qué falta por cerrar.
 */
export function useExpedientes() {
  return useQuery({
    queryKey: ['expedientes'],
    queryFn: () => apiFetchJson<Expediente[]>('/api/v1/expedientes'),
  });
}

export interface CasoCerrable {
  casoId: string;
  establecimiento: string;
  empresa: string;
}

/**
 * Casos con una evaluación Aprobada cuyo expediente todavía no existe (por
 * lo tanto, se pueden cerrar). Derivado de useCasosAsignados, igual que
 * useInformesPendientes — no hay endpoint que liste esto directamente.
 */
export function useCasosCerrables() {
  const { data: casos, isLoading } = useCasosAsignados();

  const cerrables: CasoCerrable[] = casos
    .filter(
      (c) => (!c.expediente || c.expediente.estado !== 'Cerrado') && c.evaluaciones.some((e) => e.idEstado === ID_ESTADO_EVALUACION.APROBADA)
    )
    .map((c) => ({
      casoId: c.id,
      establecimiento: c.establecimiento.nombre,
      empresa: c.establecimiento.empresa.razonSocial,
    }));

  return { data: cerrables, isLoading };
}

/** PATCH /api/v1/expedientes/:casoId/cerrar — sin body (confirmado en el controller, no declara @Body). */
export function useCerrarExpediente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (casoId: string) =>
      apiFetchJson<Expediente>(`/api/v1/expedientes/${casoId}/cerrar`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      queryClient.invalidateQueries({ queryKey: ['expedientes'] });
    },
  });
}
