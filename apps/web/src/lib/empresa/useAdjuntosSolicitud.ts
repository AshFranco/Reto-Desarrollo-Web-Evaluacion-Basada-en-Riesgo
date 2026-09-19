import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchJson } from '@/lib/http/client';
import type { AdjuntoSolicitudBpm } from '@/lib/types';

/**
 * Lista los adjuntos de una solicitud BPM.
 * Ruta: GET /api/v1/solicitudes-bpm/:id/adjuntos
 * Confirmada en solicitudes-bpm.controller.ts (línea 86).
 * Devuelve [] si la solicitud no tiene adjuntos aún.
 */
export function useAdjuntosSolicitud(solicitudId: string | null | undefined) {
  return useQuery({
    queryKey: ['adjuntos-solicitud', solicitudId],
    queryFn: () =>
      apiFetchJson<AdjuntoSolicitudBpm[]>(
        `/api/v1/solicitudes-bpm/${solicitudId}/adjuntos`,
      ),
    enabled: Boolean(solicitudId),
  });
}

export interface SubirAdjuntoInput {
  solicitudId: string;
  archivo: File;
  /** Confirmado contra SubirAdjuntoSolicitudDto: CROQUIS | MEMORIA_DESCRIPTIVA | OTRO */
  tipo: 'CROQUIS' | 'MEMORIA_DESCRIPTIVA' | 'OTRO';
}

/**
 * Sube un adjunto a una solicitud BPM en borrador.
 * Ruta: POST /api/v1/solicitudes-bpm/:id/adjuntos
 * Formato: multipart/form-data con campos `archivo` (File) y `tipo` (string).
 * El backend rechaza con 400 si la solicitud ya fue enviada.
 * No reutiliza useSubirEvidencia porque: ruta diferente, sin queue offline
 * (los adjuntos de solicitud solo aplican mientras está en borrador).
 */
export function useSubirAdjunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitudId, archivo, tipo }: SubirAdjuntoInput) => {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('tipo', tipo);

      const respuesta = await apiFetch(
        `/api/v1/solicitudes-bpm/${solicitudId}/adjuntos`,
        { method: 'POST', body: formData },
      );
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(
          cuerpo?.message ?? `Error al subir el adjunto (${respuesta.status})`,
        );
      }
      return cuerpo as AdjuntoSolicitudBpm;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['adjuntos-solicitud', variables.solicitudId],
      });
    },
  });
}

/**
 * Elimina un adjunto por su id.
 * Ruta: DELETE /api/v1/solicitudes-bpm/adjuntos/:adjuntoId
 * El backend rechaza con 400 si la solicitud ya fue enviada.
 */
export function useEliminarAdjunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      adjuntoId,
      solicitudId,
    }: {
      adjuntoId: string;
      solicitudId: string;
    }) => {
      const respuesta = await apiFetch(
        `/api/v1/solicitudes-bpm/adjuntos/${adjuntoId}`,
        { method: 'DELETE' },
      );
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(
          cuerpo?.message ?? `Error al eliminar el adjunto (${respuesta.status})`,
        );
      }
      return cuerpo as { mensaje: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['adjuntos-solicitud', variables.solicitudId],
      });
    },
  });
}
