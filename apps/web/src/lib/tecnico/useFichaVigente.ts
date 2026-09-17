import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { FormularioVigenteResponse } from '@/lib/types';

/**
 * GET /api/v1/formularios/vigente — la ficha jerárquica (secciones +
 * criterios) y las opciones de respuesta válidas. No trae datos de una
 * evaluación puntual, solo el catálogo vigente, así que se puede cachear
 * por más tiempo que el resto de los datos de la app.
 */
export function useFichaVigente() {
  return useQuery({
    queryKey: ['formularios', 'vigente'],
    queryFn: () => apiFetchJson<FormularioVigenteResponse>('/api/v1/formularios/vigente'),
    staleTime: 1000 * 60 * 60,
  });
}
