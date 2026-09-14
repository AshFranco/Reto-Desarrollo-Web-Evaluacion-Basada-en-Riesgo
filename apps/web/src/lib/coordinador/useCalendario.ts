import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

export interface EvaluacionCalendario {
  id: string;
  idEstado: number | null;
  fechaProgramada: string | null;
  establecimiento: { nombre: string; calle: string | null };
}

export interface RangoFechas {
  desde?: string;
  hasta?: string;
}

/**
 * GET /api/v1/calendario ya no es solo para TECNICO_EVALUADOR — Gabriela lo
 * abrió también a COORDINADOR/ADMINISTRADOR (calendario.controller.ts), pero
 * para esos dos roles el parámetro `evaluadorId` es OBLIGATORIO (el backend
 * responde 400 sin él: "Debe indicar el parámetro evaluadorId..."). Un
 * Técnico Evaluador puede omitirlo y el backend usa su propio id — pero acá
 * se pide siempre explícito (undefined = "todavía no elegido") para que el
 * mismo hook sirva igual desde el dashboard de Coordinador (elige un
 * técnico de una lista) y, el día de mañana, desde el de Técnico (pasando
 * su propio id de sesión) sin dos formas distintas de llamarlo.
 *
 * No pide nada hasta que evaluadorId tenga un valor real.
 */
export function useCalendario(evaluadorId: string | undefined, rango: RangoFechas = {}) {
  const params = new URLSearchParams();
  if (evaluadorId) params.set('evaluadorId', evaluadorId);
  if (rango.desde) params.set('desde', rango.desde);
  if (rango.hasta) params.set('hasta', rango.hasta);
  const query = params.toString();

  return useQuery({
    queryKey: ['calendario', evaluadorId ?? null, rango.desde ?? null, rango.hasta ?? null],
    queryFn: () => apiFetchJson<EvaluacionCalendario[]>(`/api/v1/calendario${query ? `?${query}` : ''}`),
    enabled: !!evaluadorId,
  });
}
