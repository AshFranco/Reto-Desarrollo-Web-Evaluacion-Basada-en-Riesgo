import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { CatalogoMotorRiesgo, ResultadoRiesgo } from '@/lib/types';

/**
 * GET /api/v1/motor-riesgo/catalogo — los factores de riesgo del
 * establecimiento (5 manuales + 1 automático) con sus opciones. El
 * técnico tiene que elegir una opción por cada factor manual antes de
 * poder calcular el riesgo.
 */
export function useCatalogoMotorRiesgo() {
  return useQuery({
    queryKey: ['motor-riesgo', 'catalogo'],
    queryFn: () => apiFetchJson<CatalogoMotorRiesgo>('/api/v1/motor-riesgo/catalogo'),
    staleTime: 1000 * 60 * 60,
  });
}

export interface SeleccionFactor {
  factorId: string;
  opcionId: string;
}

/**
 * POST /api/v1/motor-riesgo/calcular — confirmado en vivo (calcular-riesgo.dto.ts
 * y motor-riesgo.service.ts) que exige una selección por cada factor NO
 * automático (el factor "Cumplimiento con las BPM" se resuelve solo, a
 * partir del % de la ficha); si falta alguno, el backend responde 400 con
 * el nombre exacto del factor faltante.
 *
 * La FORMA de la respuesta no se pudo verificar en vivo — el endpoint
 * devuelve 500 en este ambiente por un bug real de empaquetado de
 * @ebr/risk-engine, ajeno a este código (ver el comentario en
 * ResultadoRiesgo, lib/types.ts).
 */
export function useCalcularRiesgo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluacionId,
      seleccionesFactores,
    }: {
      evaluacionId: string;
      seleccionesFactores: SeleccionFactor[];
    }) =>
      apiFetchJson<ResultadoRiesgo>('/api/v1/motor-riesgo/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacionId, seleccionesFactores }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', variables.evaluacionId] });
    },
  });
}
