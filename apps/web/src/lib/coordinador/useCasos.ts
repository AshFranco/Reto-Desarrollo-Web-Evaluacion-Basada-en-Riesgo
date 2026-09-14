import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { AsignacionEvaluador, CasoDetalle, CasoResumen } from '@/lib/types';

/**
 * IDs numéricos de estado_evaluacion, confirmados en vivo (creando una
 * evaluación real y siguiéndola paso a paso con GET /evaluaciones/mias,
 * que sí incluye el código junto al id). No hay ningún endpoint catálogo
 * que resuelva id -> código para roles distintos del propio Técnico
 * Evaluador dueño de la evaluación — GET /casos/:id (lo que usa Coordinador)
 * solo trae el `idEstado` crudo. Estos valores coinciden con el orden de
 * inserción de prisma/seed.ts; si el seed cambiara de orden esto quedaría
 * desactualizado. Lo ideal sería que el backend incluyera el código
 * también en GET /casos/:id, igual que ya hace en /evaluaciones/mias.
 */
export const ID_ESTADO_EVALUACION = {
  PROGRAMADA: 1,
  EN_CURSO: 2,
  FINALIZADA: 3,
  EN_REVISION: 4,
  APROBADA: 5,
  DEVUELTA: 6,
  CERRADA: 7,
} as const;

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

/**
 * Casos "Asignado" con su detalle completo (evaluaciones + expediente).
 * No existe un endpoint que liste evaluaciones o expedientes pendientes de
 * revisión/cierre directamente (confirmado revisando casos.controller.ts,
 * evaluaciones.controller.ts y expedientes.controller.ts) — el único
 * estado de caso disponible es Pendiente/Asignado/Cerrado, así que hay que
 * traer el detalle de cada caso "Asignado" para saber en qué estado está
 * su evaluación. Es la base que usan useInformesPendientes y
 * useCasosCerrables.
 */
export function useCasosAsignados() {
  const { data: casos, isLoading: cargandoCasos } = useCasos();
  const asignados = (casos ?? []).filter((c) => c.estado === 'Asignado');

  const detalles = useQueries({
    queries: asignados.map((c) => ({
      queryKey: ['casos', c.id],
      queryFn: () => apiFetchJson<CasoDetalle>(`/api/v1/casos/${c.id}`),
    })),
  });

  return {
    isLoading: cargandoCasos || detalles.some((d) => d.isLoading),
    data: detalles.map((d) => d.data).filter((d): d is CasoDetalle => !!d),
  };
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
