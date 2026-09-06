import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { AsignacionEvaluador, CasoDetalle, CasoResumen } from '@/lib/types';

/**
 * GET /api/v1/casos no acepta ningún parámetro de filtro (confirmado en
 * casos.controller.ts — el método `listar` no declara @Query()). El
 * backend ya filtra qué casos ve cada rol, pero no hay forma de pedirle
 * un subconjunto server-side. Cualquier filtro adicional se hace en el
 * cliente, sobre la lista ya traída.
 */
export function useCasos() {
  return useQuery({
    queryKey: ['casos'],
    queryFn: () => apiFetchJson<CasoResumen[]>('/api/v1/casos'),
  });
}

export function useCasoDetalle(id: string | null) {
  return useQuery({
    queryKey: ['casos', id],
    queryFn: () => apiFetchJson<CasoDetalle>(`/api/v1/casos/${id}`),
    enabled: !!id,
  });
}

/** DTO confirmado contra AsignarEvaluadorDto: { casoId, evaluadorId }. */
export function useAsignarEvaluador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ casoId, evaluadorId }: { casoId: string; evaluadorId: string }) =>
      apiFetchJson<AsignacionEvaluador>('/api/v1/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casoId, evaluadorId }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      queryClient.invalidateQueries({ queryKey: ['casos', variables.casoId] });
    },
  });
}
