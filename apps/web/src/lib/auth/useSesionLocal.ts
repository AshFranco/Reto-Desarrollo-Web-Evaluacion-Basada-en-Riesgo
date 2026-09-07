import { useState, useEffect } from 'react';
import { getSession } from './session';
import type { SesionLocal } from '@/lib/db';

/**
 * Retorna la sesión guardada en IndexedDB.
 * - undefined → cargando (aún no se leyó Dexie)
 * - null      → no autenticado
 * - SesionLocal → autenticado
 */
export function useSesionLocal(): SesionLocal | null | undefined {
  const [sesion, setSesion] = useState<SesionLocal | null | undefined>(undefined);

  useEffect(() => {
    getSession().then(setSesion);
  }, []);

  return sesion;
}
