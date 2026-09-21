import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

export interface EvaluacionCalendario {
  id: string;
  idEstado: number | null;
  fechaProgramada: string | null;
  establecimiento: { nombre: string; calle: string | null };
}

/** Forma real de GET /calendario SIN evaluadorId, para COORDINADOR/ADMINISTRADOR (calendario.controller.ts#obtener -> obtenerCalendarioEquipo()). */
export interface CalendarioTecnico {
  evaluadorId: string;
  nombreCompleto: string;
  evaluaciones: EvaluacionCalendario[];
}

export interface RangoFechas {
  desde?: string;
  hasta?: string;
}

function construirQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor) query.set(clave, valor);
  }
  const texto = query.toString();
  return texto ? `?${texto}` : '';
}

/**
 * GET /api/v1/calendario con evaluadorId — calendario de UN técnico en
 * particular. Confirmado en vivo (calendario.controller.ts): con
 * evaluadorId, tanto el propio Técnico Evaluador como un
 * Coordinador/Administrador pueden pedirlo. No pide nada hasta que
 * evaluadorId tenga un valor real.
 */
export function useCalendario(evaluadorId: string | undefined, rango: RangoFechas = {}) {
  const query = construirQuery({ evaluadorId, desde: rango.desde, hasta: rango.hasta });

  return useQuery({
    queryKey: ['calendario', evaluadorId ?? null, rango.desde ?? null, rango.hasta ?? null],
    queryFn: () => apiFetchJson<EvaluacionCalendario[]>(`/api/v1/calendario${query}`),
    enabled: !!evaluadorId,
  });
}

/**
 * GET /api/v1/calendario SIN evaluadorId — confirmado en vivo contra el
 * backend real (Docker) que para COORDINADOR/ADMINISTRADOR esto ya NO da
 * 400 (como se creía antes): devuelve el calendario combinado de todo el
 * equipo, agrupado por técnico (calendario.service.ts#obtenerCalendarioEquipo).
 * Forma distinta a useCalendario() -- por eso es un hook separado en vez de
 * una variante del mismo.
 */
export function useCalendarioEquipo(rango: RangoFechas = {}) {
  const query = construirQuery({ desde: rango.desde, hasta: rango.hasta });

  return useQuery({
    queryKey: ['calendario', 'equipo', rango.desde ?? null, rango.hasta ?? null],
    queryFn: () => apiFetchJson<CalendarioTecnico[]>(`/api/v1/calendario${query}`),
  });
}

/**
 * PATCH /api/v1/calendario/:id/reprogramar — DTO confirmado en
 * calendario.controller.ts (ReprogramarCitaDto): nuevaFecha obligatoria,
 * comentario opcional. El `:id` es el id de la Evaluación, no de una cita
 * separada (confirmado en calendario.service.ts#reprogramar).
 */
export function useReprogramarEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nuevaFecha, comentario }: { id: string; nuevaFecha: string; comentario?: string }) =>
      apiFetchJson<{ mensaje: string }>(`/api/v1/calendario/${id}/reprogramar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevaFecha, comentario }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario'] });
    },
  });
}

/**
 * PATCH /api/v1/calendario/:id/cancelar -- body opcional { motivo } (CancelarCitaDto).
 * Solo aplica a citas en estado Programada: el backend responde 400 en cualquier otro caso.
 */
export function useCancelarCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      apiFetchJson<{ mensaje: string }>(`/api/v1/calendario/${id}/cancelar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario'] });
    },
  });
}
