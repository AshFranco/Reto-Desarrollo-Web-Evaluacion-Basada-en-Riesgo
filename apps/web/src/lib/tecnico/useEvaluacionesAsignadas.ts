import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { AsignacionMia } from '@/lib/types';

/**
 * GET /api/v1/asignaciones/mias (asignaciones.service.ts, listarPorEvaluador)
 * devuelve asignaciones con su caso, establecimiento y — desde que Gabriela
 * lo agregó — el `evaluacionId` real de cada una (confirmado en vivo,
 * coincide con el id que devuelve POST /asignaciones). El nombre del hook
 * sigue diciendo "asignadas" porque es literalmente lo que devuelve el
 * endpoint, aunque ahora sí trae consigo el dato necesario para iniciar
 * la evaluación directamente desde esta lista — ver DashboardTecnico.tsx.
 */
export function useEvaluacionesAsignadas() {
  return useQuery({
    queryKey: ['asignaciones', 'mias'],
    queryFn: () => apiFetchJson<AsignacionMia[]>('/api/v1/asignaciones/mias'),
  });
}
