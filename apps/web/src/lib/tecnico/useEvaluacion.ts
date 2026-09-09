import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { EvaluacionDetalle } from '@/lib/types';

/** GET /api/v1/evaluaciones/:id — detalle completo, incluye respuestas ya guardadas. */
export function useEvaluacionDetalle(evaluacionId: string | undefined) {
  return useQuery({
    queryKey: ['evaluaciones', evaluacionId],
    queryFn: () => apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}`),
    enabled: !!evaluacionId,
  });
}

/**
 * POST /api/v1/evaluaciones/:id/iniciar — confirmado en vivo (y en
 * evaluaciones.service.ts) que exige que la evaluación esté en estado
 * PROGRAMADA; si ya se inició antes devuelve 400 "La evaluación ya fue
 * iniciada o finalizada." El llamador decide qué hacer con ese caso
 * puntual (ver DashboardTecnico.tsx: se trata como no-error, porque
 * significa que ya se puede continuar directo a la ejecución).
 */
export function useIniciarEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evaluacionId: string) =>
      apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}/iniciar`, { method: 'POST' }),
    onSuccess: (_data, evaluacionId) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
    },
  });
}

export interface RespuestaItemInput {
  itemId: string;
  codigoOpcion: 'C' | 'CP' | 'IT' | 'N/A';
  nivelCriticidad?: 'C' | 'M' | 'Me';
  observacion?: string;
}

/**
 * POST /api/v1/evaluaciones/:id/respuestas — confirmado contra
 * registrar-respuestas.dto.ts: body `{ respuestas: RespuestaItemDto[] }`,
 * donde cada item pide `itemId`, `codigoOpcion` ('C'|'CP'|'IT'|'N/A') y,
 * SOLO si el código es CP o IT (hay un hallazgo), `nivelCriticidad`
 * ('C'|'M'|'Me') es obligatorio — si falta, el backend responde 400. Se
 * manda un item por llamada para guardar avance progresivo por criterio.
 */
export function useResponderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluacionId, ...respuesta }: RespuestaItemInput & { evaluacionId: string }) =>
      apiFetchJson<{ mensaje: string }>(`/api/v1/evaluaciones/${evaluacionId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas: [respuesta] }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', variables.evaluacionId] });
    },
  });
}

/**
 * POST /api/v1/evaluaciones/:id/finalizar — confirmado en vivo (y en
 * evaluaciones.service.ts) que exige que TODOS los ítems evaluables de la
 * ficha tengan respuesta; si faltan, responde 400 con el conteo exacto
 * ("Faltan respuestas: X/Y ítems respondidos."). También falla si la
 * evaluación ya estaba bloqueada (ya se había finalizado antes).
 */
export function useFinalizarEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evaluacionId: string) =>
      apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}/finalizar`, { method: 'POST' }),
    onSuccess: (_data, evaluacionId) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones', 'mias'] });
    },
  });
}
