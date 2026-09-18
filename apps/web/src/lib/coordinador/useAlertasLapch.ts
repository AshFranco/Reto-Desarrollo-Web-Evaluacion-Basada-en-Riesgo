import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

/**
 * Forma confirmada contra alertas-lapch.service.ts (serializar()):
 * `resultado` es null hasta que se resuelve. No hay campo de "estado"
 * separado -- pendiente/resuelta se deriva de si resultado es null o no.
 */
export interface AlertaLapch {
  id: string;
  numeroAlerta: string;
  fecha: string;
  producto: string | null;
  descripcion: string | null;
  idEmpresa: string | null;
  idEstablecimiento: string | null;
  resultado: 'PROCEDE' | 'NO_PROCEDE' | null;
}

/** DTO confirmado contra CrearAlertaLapchDto -- solo numeroAlerta y fecha son obligatorios. */
export interface DatosAlertaLapch {
  numeroAlerta: string;
  fecha: string;
  producto?: string;
  empresaId?: string;
  establecimientoId?: string;
  descripcion?: string;
}

/** GET /api/v1/alertas-lapch -- @Roles(ADMINISTRADOR, COORDINADOR) a nivel de controlador, sin filtros de query. */
export function useAlertasLapch() {
  return useQuery({
    queryKey: ['alertas-lapch'],
    queryFn: () => apiFetchJson<AlertaLapch[]>('/api/v1/alertas-lapch'),
  });
}

export function useCrearAlertaLapch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosAlertaLapch) =>
      apiFetchJson<AlertaLapch>('/api/v1/alertas-lapch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertas-lapch'] }),
  });
}

/**
 * PATCH /alertas-lapch/:id/resolver -- confirmado en alertas-lapch.service.ts
 * que si resultado es PROCEDE, el backend exige que la alerta ya tenga
 * idEstablecimiento (si no, tira 400 "La alerta debe tener un
 * establecimiento asociado para generar el caso") y ahí mismo crea el Caso
 * automáticamente (origen "ALERTA", prioridad ALTA). Por eso se invalida
 * también la query de casos.
 */
export function useResolverAlertaLapch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resultado }: { id: string; resultado: 'PROCEDE' | 'NO_PROCEDE' }) =>
      apiFetchJson<AlertaLapch>(`/api/v1/alertas-lapch/${id}/resolver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas-lapch'] });
      queryClient.invalidateQueries({ queryKey: ['casos'] });
    },
  });
}
