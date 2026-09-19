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
  tipo: 'INICIAR_EVALUACION' | 'RESPUESTAS' | 'FINALIZAR_EVALUACION' | 'GENERAR_INFORME',
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
 *
 * BUG REAL encontrado y corregido acá: `finalizar()` por sí solo deja la
 * evaluación en FINALIZADA, NO en EN_REVISION -- confirmado en vivo que el
 * Coordinador no puede revisarla hasta ese punto (PATCH /informes/:id/revisar
 * responde 400 "La evaluación no está en revisión."). El paso que realmente
 * mueve FINALIZADA -> EN_REVISION es `POST /informes` (informes.service.ts#generar).
 * Antes de este fix, el frontend nunca llamaba a ese endpoint, así que
 * ninguna evaluación llegaba jamás a la bandeja del Coordinador en un uso
 * real de la app. Se encadena acá, después de que finalizar() confirma éxito.
 *
 * Si finalizar() tiene éxito pero la generación del informe falla (ej. un
 * corte de red justo en el medio), NO se reintenta finalizar() -- ya
 * quedó bloqueada=true en el servidor, y un segundo POST /finalizar
 * respondería 403 "ya fue enviada previamente". POST /informes sí es
 * seguro de reintentar (usa upsert en el backend), así que ese fallo se
 * devuelve aparte (`advertenciaInforme`) para que la pantalla avise sin
 * hacer parecer que finalizar falló.
 */
  export function useFinalizarEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evaluacionId: string) => {
      const resultado = await conFallbackOffline(
        () => apiFetchJson<EvaluacionDetalle>(`/api/v1/evaluaciones/${evaluacionId}/finalizar`, { method: 'POST' }),
        'FINALIZAR_EVALUACION',
        { evaluacionServerId: evaluacionId }
      );
      return resultado;
    },
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
 * POST /api/v1/informes — Genera el informe final y pasa el caso a estado EN_REVISION para el coordinador.
 */
export function useGenerarInforme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evaluacionId: string) => {
      return conFallbackOffline(
        () => apiFetchJson(`/api/v1/informes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evaluacionId }),
        }),
        'GENERAR_INFORME',
        { evaluacionServerId: evaluacionId }
      );
    },
    onSuccess: (_data, evaluacionId) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
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

/** Forma confirmada contra evaluaciones.service.ts#obtenerObservaciones() -- historial de estados, más reciente primero. */
export interface ObservacionEvaluacion {
  id: string;
  estado: string;
  codigoEstado: string;
  usuario: string;
  comentario: string | null;
  fechaHora: string;
}

/**
 * GET /api/v1/evaluaciones/:id/observaciones — devuelve TODO el historial
 * de estados de la evaluación (no solo la devolución), ordenado del más
 * reciente al más viejo. Cuando la evaluación está Devuelta, el primer
 * elemento es la entrada de la devolución -- su `comentario` viene con el
 * prefijo `[DEVOLVER]` o `[SOLICITAR_CORRECCION]` (ver
 * informes.service.ts), el mismo texto que ya resume
 * `evaluacion.ultimaAccionCoordinador`, pero acá viene completo.
 */
export function useObservacionesEvaluacion(evaluacionId: string | undefined) {
  return useQuery({
    queryKey: ['evaluaciones', evaluacionId, 'observaciones'],
    queryFn: () => apiFetchJson<ObservacionEvaluacion[]>(`/api/v1/evaluaciones/${evaluacionId}/observaciones`),
    enabled: !!evaluacionId,
  });
}

/**
 * PATCH /api/v1/evaluaciones/:id/corregir — confirmado contra
 * evaluaciones.service.ts#corregir(): recibe el mismo body que
 * POST /respuestas (`RegistrarRespuestasDto`, no solo el id), porque
 * `corregir()` llama internamente a `registrarRespuestas()` con ese dto
 * ANTES de desbloquear y cambiar el estado a EN_CURSO.
 *
 * Es el ÚNICO endpoint que puede escribir respuestas mientras la
 * evaluación sigue `bloqueada=true` -- confirmado en vivo que Devuelta NO
 * desbloquea la evaluación por sí sola (informes.service.ts#revisar()
 * solo cambia idEstado, nunca toca `bloqueada`), así que el POST
 * /respuestas normal (useResponderItem) seguiría dando 403 "ya fue
 * enviada" hasta que corregir() se llame al menos una vez. Por eso el
 * flujo real es: la PRIMERA respuesta que el técnico guarda después de
 * una devolución pasa por acá (con un solo item en `respuestas`); una vez
 * que corregir() desbloquea y pone EN_CURSO, las respuestas siguientes ya
 * pueden usar el POST /respuestas normal sin volver a llamar corregir().
 */
export function useCorregirEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluacionId, respuestas }: { evaluacionId: string; respuestas: RespuestaItemInput[] }) =>
      apiFetchJson<{ mensaje: string; evaluacion: EvaluacionDetalle }>(`/api/v1/evaluaciones/${evaluacionId}/corregir`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', variables.evaluacionId] });
      queryClient.setQueryData<AsignacionMia[]>(['asignaciones', 'mias'], (prev) =>
        prev?.map((a) => (a.evaluacionId === variables.evaluacionId ? { ...a, evaluacionEstado: 'EN_CURSO' } : a))
      );
      void db.asignacion.toCollection().modify((a) => {
        if (a.evaluacionId === variables.evaluacionId) a.evaluacionEstado = 'EN_CURSO';
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['asignaciones', 'mias'] });
    },
  });
}
