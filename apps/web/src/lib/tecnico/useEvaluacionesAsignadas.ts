import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import { db } from '@/lib/db';
import type { AsignacionMia } from '@/lib/types';

/**
 * Obtiene las asignaciones del técnico evaluador:
 * 1. Intenta consultar el endpoint remoto /api/v1/asignaciones/mias.
 * 2. Si tiene éxito, persiste los datos en la tabla IndexedDB `db.asignacion` para uso sin conexión.
 * 3. Si la petición falla (sin red o servidor inalcanzable), recupera la lista desde IndexedDB.
 */
export async function fetchAsignacionesMias(): Promise<AsignacionMia[]> {
  try {
    const remotas = await apiFetchJson<AsignacionMia[]>('/api/v1/asignaciones/mias');
    if (Array.isArray(remotas)) {
      try {
        await db.transaction('rw', db.asignacion, async () => {
          await db.asignacion.clear();
          await db.asignacion.bulkPut(remotas);
        });
      } catch (errDb) {
        console.warn('No se pudieron guardar las asignaciones en IndexedDB:', errDb);
      }
    }
    return remotas;
  } catch (err) {
    try {
      const locales = await db.asignacion.toArray();
      if (locales && locales.length > 0) {
        return locales;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return [];
      }
    } catch (errDb) {
      console.warn('No se pudieron leer las asignaciones de IndexedDB:', errDb);
    }
    throw err;
  }
}

/**
 * Hook para obtener las asignaciones del evaluador autenticado.
 * Usa networkMode: 'offlineFirst' para que se ejecute la función de consulta
 * aun sin conexión a internet y devuelva los casos almacenados localmente.
 */
export function useEvaluacionesAsignadas() {
  return useQuery({
    queryKey: ['asignaciones', 'mias'],
    queryFn: fetchAsignacionesMias,
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5,
  });
}
