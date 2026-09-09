import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/client';
import type { Evidencia } from '@/lib/types';

export interface SubirEvidenciaInput {
  evaluacionId: string;
  archivo: File;
  tipo: 'FOTO' | 'VIDEO' | 'DOCUMENTO';
  /**
   * Id de la fila respuesta_item (no el id del ítem del catálogo) —
   * confirmado en vivo. Si se omite, la evidencia queda asociada a la
   * evaluación en general en vez de a un criterio puntual.
   */
  respuestaItemId?: string;
}

/**
 * POST /api/v1/evidencias — multipart, confirmado en vivo (límite 15MB,
 * valida el archivo real por magic bytes vía FileValidationPipe, no por
 * extensión). Confirmado también que el backend rechaza la subida con 403
 * si la evaluación ya está bloqueada — solo se puede adjuntar evidencia
 * mientras se está trabajando la ficha, antes de "Finalizar".
 *
 * No existe ningún GET que liste evidencias ya subidas para una
 * evaluación (confirmado revisando evidencias.controller.ts, solo declara
 * POST) — por eso la pantalla solo puede mostrar lo subido en la sesión
 * actual, no recuperarlo después de recargar la página.
 */
export function useSubirEvidencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evaluacionId, archivo, tipo, respuestaItemId }: SubirEvidenciaInput) => {
      const formData = new FormData();
      formData.append('evaluacionId', evaluacionId);
      formData.append('tipo', tipo);
      if (respuestaItemId) formData.append('respuestaItemId', respuestaItemId);
      formData.append('archivo', archivo);

      const respuesta = await apiFetch('/api/v1/evidencias', { method: 'POST', body: formData });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(cuerpo?.message ?? `Error al subir el archivo (${respuesta.status})`);
      }
      return cuerpo as Evidencia;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', variables.evaluacionId] });
    },
  });
}
