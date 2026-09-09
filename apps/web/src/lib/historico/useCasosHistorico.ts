import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { CasoHistorico, FiltrosCasosHistorico } from '@/lib/types';

/**
 * GET /api/v1/casos/historico — confirmado en vivo con los 5 filtros del
 * SRS. Sin @Roles restrictivo: cualquier rol autenticado puede llamarlo,
 * pero el servidor aplica scoping automático por empresa para roles no
 * internos (fuerza su propio empresaId, ignora cualquier otro que se
 * intente mandar) — por eso `empresaId` acá es solo relevante para
 * Administrador/Coordinador/Técnico, que sí pueden elegir qué empresa ver.
 */
export function useCasosHistorico(filtros: FiltrosCasosHistorico) {
  const params = new URLSearchParams();
  if (filtros.empresaId) params.set('empresaId', filtros.empresaId);
  if (filtros.solicitudId) params.set('solicitudId', filtros.solicitudId);
  if (filtros.evaluacionId) params.set('evaluacionId', filtros.evaluacionId);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.fechaCreacionDesde) params.set('fechaCreacionDesde', filtros.fechaCreacionDesde);
  if (filtros.fechaCreacionHasta) params.set('fechaCreacionHasta', filtros.fechaCreacionHasta);
  const query = params.toString();

  return useQuery({
    queryKey: ['casos', 'historico', filtros],
    queryFn: () => apiFetchJson<CasoHistorico[]>(`/api/v1/casos/historico${query ? `?${query}` : ''}`),
  });
}
