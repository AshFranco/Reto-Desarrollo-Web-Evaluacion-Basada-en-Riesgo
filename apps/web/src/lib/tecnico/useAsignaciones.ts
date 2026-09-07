import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { AsignacionMia } from '@/lib/types';

export function useAsignaciones() {
  return useQuery<AsignacionMia[]>({
    queryKey: ['asignaciones', 'mias'],
    queryFn: () => apiFetchJson('/api/v1/asignaciones/mias'),
    staleTime: 1000 * 60 * 10,
  });
}
