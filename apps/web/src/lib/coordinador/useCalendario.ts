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
 * ADVERTENCIA: GET /api/v1/calendario está restringido a TECNICO_EVALUADOR
 * a nivel de controlador (calendario.controller.ts, @Roles a nivel de clase)
 * y el propio servicio siempre filtra por el id del usuario autenticado
 * (calendario.service.ts: `idEvaluador: user.sub`). Un COORDINADOR que
 * llame a este hook recibe 403 — no hay forma de ver el calendario de todo
 * el equipo hoy. Se construye igual porque se pidió explícitamente y
 * porque sí sirve tal cual para un futuro dashboard de Técnico Evaluador.
 * DashboardCoordinador.tsx NO lo usa por esta razón — ver el aviso ahí.
 */
export function useCalendario(rango: RangoFechas = {}) {
  const params = new URLSearchParams();
  if (rango.desde) params.set('desde', rango.desde);
  if (rango.hasta) params.set('hasta', rango.hasta);
  const query = params.toString();

  return useQuery({
    queryKey: ['calendario', rango.desde ?? null, rango.hasta ?? null],
    queryFn: () => apiFetchJson<EvaluacionCalendario[]>(`/api/v1/calendario${query ? `?${query}` : ''}`),
  });
}
