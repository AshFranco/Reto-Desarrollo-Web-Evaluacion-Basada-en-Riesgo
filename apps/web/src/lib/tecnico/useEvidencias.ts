import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/client';
import { enqueue } from '@/lib/sync/queue';
import type { Evidencia } from '@/lib/types';

/**
 * Resultado cuando la subida quedó encolada en cola_sync en vez de
 * completarse contra el servidor (ver useEvaluacion.ts para el mismo
 * patrón sobre respuestas/iniciar/finalizar).
 */
interface EvidenciaEncolada {
  encolado: true;
}

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
  latitud?: number;
  longitud?: number;
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
    mutationFn: async ({
      evaluacionId, archivo, tipo, respuestaItemId, latitud, longitud,
    }: SubirEvidenciaInput): Promise<Evidencia | EvidenciaEncolada> => {
      try {
        const formData = new FormData();
        formData.append('evaluacionId', evaluacionId);
        formData.append('tipo', tipo);
        if (respuestaItemId) formData.append('respuestaItemId', respuestaItemId);
        if (latitud !== undefined && latitud !== null) formData.append('latitud', String(latitud));
        if (longitud !== undefined && longitud !== null) formData.append('longitud', String(longitud));
        formData.append('archivo', archivo);

        const respuesta = await apiFetch('/api/v1/evidencias', { method: 'POST', body: formData });
        const cuerpo = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          throw new Error(cuerpo?.message ?? `Error al subir el archivo (${respuesta.status})`);
        }
        return cuerpo as Evidencia;
      } catch (err) {
        // TypeError = fetch() no completó la petición (sin conexión o
        // servidor inalcanzable) -- un error de negocio real (403 bloqueada,
        // 400, etc.) llega como Error, nunca como TypeError, y se propaga
        // igual que antes. Mismo criterio que useEvaluacion.ts.
        if (!(err instanceof TypeError)) throw err;
        await enqueue('EVIDENCIA', {
          evaluacionId, tipo, respuestaItemId, latitud, longitud,
          blob: archivo, nombreArchivo: archivo.name,
        });
        return { encolado: true };
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', variables.evaluacionId] });
    },
  });
}

export function useEliminarEvidencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evidenciaId, evaluacionId }: { evidenciaId: string; evaluacionId: string }) => {
      const respuesta = await apiFetch(`/api/v1/evidencias/${evidenciaId}`, { method: 'DELETE' });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(cuerpo?.message ?? `Error al eliminar la evidencia (${respuesta.status})`);
      }
      return cuerpo;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', variables.evaluacionId] });
    },
  });
}
