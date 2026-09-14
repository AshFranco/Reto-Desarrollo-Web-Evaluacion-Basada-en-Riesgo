import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { SolicitudBpm } from '@/lib/types';

/** DTO confirmado contra CrearSolicitudBpmDto. */
export interface DatosSolicitud {
  tipoEstablecimiento: string;
  motivo: string;
  observaciones?: string;
}

export function useSolicitudesPropias() {
  return useQuery({
    queryKey: ['solicitudes-bpm', 'mias'],
    queryFn: () => apiFetchJson<SolicitudBpm[]>('/api/v1/solicitudes-bpm/mias'),
  });
}

export function useCrearSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosSolicitud) =>
      apiFetchJson<SolicitudBpm>('/api/v1/solicitudes-bpm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-bpm', 'mias'] }),
  });
}

/**
 * EnviarSolicitudDto exige establecimientoId (confirmado en
 * dto/solicitud-bpm.dto.ts) porque caso.id_establecimiento es obligatorio.
 * No hay endpoint de establecimientos en el backend — quien use este hook
 * tiene que conseguir el id de otra forma (ver el aviso en las pantallas).
 */
export function useEnviarSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, establecimientoId }: { id: string; establecimientoId: string }) =>
      apiFetchJson<SolicitudBpm>(`/api/v1/solicitudes-bpm/${id}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establecimientoId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-bpm', 'mias'] }),
  });
}
