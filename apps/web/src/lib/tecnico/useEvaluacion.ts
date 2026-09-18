import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync/queue';
import type { EvaluacionDetalle, AsignacionMia } from '@/lib/types';

/**
 * Resultado de una mutación que, sin conexión, quedó encolada en
 * cola_sync en vez de completarse contra el servidor. SyncProcessor la
 * reintenta automáticamente al reconectar (ver sync/processor.ts).
 */
interface Encolada {
  encolado: true;
}

/**
 * Ejecuta la petición real; si fetch() no pudo completarse (sin conexión o
 * servidor inalcanzable, TypeError) encola la operación para reintento
 * automático en vez de perderla en silencio -- ese silencio era el bug de
 * PR #11 (ver useSincronizacionEvaluacion.ts). Un error de negocio real
 * (400, 401 ya manejado por apiFetch, etc.) llega como Error/SesionExpiradaError,
 * nunca como TypeError, así que se propaga tal cual: encolar un 400 real
 * solo lo haría reintentar en vano hasta agotar los intentos, sin que el
 * técnico se entere de que su dato es inválido.
 */
async function conFallbackOffline<T>(
  peticion: () => Promise<T>,
  tipo: 'INICIAR_EVALUACION' | 'RESPUESTAS' | 'FINALIZAR_EVALUACION',
  payload: object
): Promise<T | Encolada> {
  try {
    return await peticion();
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    await enqueue(tipo, payload);
    return { encolado: true };
  }
}

async function fetchEvaluacionDetalle(evaluacionId: string): Promise<EvaluacionDetalle> {
  const claveStorage = `evaluacion_detalle_${evaluacionId}`;
  try {
    const remota = await apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}`);
    try {
      localStorage.setItem(claveStorage, JSON.stringify(remota));
    } catch {
      // Ignorar quota exceeded
    }
    return remota;
  } catch (err) {
    try {
      const guardada = localStorage.getItem(claveStorage);
      if (guardada) {
        return JSON.parse(guardada) as EvaluacionDetalle;
      }
    } catch {
      // Ignorar parse error
    }
    throw err;
  }
}

/** GET /api/v1/evaluaciones/:id — detalle completo, incluye respuestas ya guardadas y respaldo offline. */
export function useEvaluacionDetalle(evaluacionId: string | undefined) {
  return useQuery({
    queryKey: ['evaluaciones', evaluacionId],
    queryFn: () => (evaluacionId ? fetchEvaluacionDetalle(evaluacionId) : Promise.reject(new Error('ID no provisto'))),
    enabled: !!evaluacionId,
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5,
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
      conFallbackOffline(
        () => apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}/iniciar`, { method: 'POST' }),
        'INICIAR_EVALUACION',
        { evaluacionServerId: evaluacionId }
      ),
    onSuccess: (_data, evaluacionId) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
      queryClient.setQueryData<AsignacionMia[]>(['asignaciones', 'mias'], (prev) =>
        prev?.map((a) => (a.evaluacionId === evaluacionId ? { ...a, evaluacionEstado: 'EN_CURSO' } : a))
      );
      void db.asignacion.toCollection().modify((a) => {
        if (a.evaluacionId === evaluacionId) a.evaluacionEstado = 'EN_CURSO';
      }).catch(() => {});
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
      conFallbackOffline(
        () =>
          apiFetchJson<{ mensaje: string }>(`/api/v1/evaluaciones/${evaluacionId}/respuestas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ respuestas: [respuesta] }),
          }),
        'RESPUESTAS',
        { evaluacionServerId: evaluacionId, respuestas: [respuesta] }
      ),
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
      conFallbackOffline(
        () => apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}/finalizar`, { method: 'POST' }),
        'FINALIZAR_EVALUACION',
        { evaluacionServerId: evaluacionId }
      ),
    onSuccess: (_data, evaluacionId) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
      queryClient.setQueryData<AsignacionMia[]>(['asignaciones', 'mias'], (prev) =>
        prev?.map((a) => (a.evaluacionId === evaluacionId ? { ...a, evaluacionEstado: 'FINALIZADA' } : a))
      );
      void db.asignacion.toCollection().modify((a) => {
        if (a.evaluacionId === evaluacionId) a.evaluacionEstado = 'FINALIZADA';
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['asignaciones', 'mias'] });
    },
  });
}

/**
 * POST /api/v1/evaluaciones/:id/reabrir — desbloquea la evaluación para
 * permitir volver a editarla (principio de heurística).
 */
export function useReabrirEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evaluacionId: string) =>
      apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}/reabrir`, { method: 'POST' }),
    onSuccess: (_data, evaluacionId) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
      queryClient.setQueryData<AsignacionMia[]>(['asignaciones', 'mias'], (prev) =>
        prev?.map((a) => (a.evaluacionId === evaluacionId ? { ...a, evaluacionEstado: 'EN_CURSO' } : a))
      );
      void db.asignacion.toCollection().modify((a) => {
        if (a.evaluacionId === evaluacionId) a.evaluacionEstado = 'EN_CURSO';
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['asignaciones', 'mias'] });
    },
  });
}

