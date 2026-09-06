import { useEffect, useState } from 'react';
import { getSession } from './session';
import type { SesionLocal } from '@/lib/db';

/**
 * Envuelve getSession() (que es async porque lee de Dexie) en un hook de
 * React para que un componente pueda leer la sesión actual de forma
 * reactiva. AppLayout.tsx tiene una versión propia de este mismo patrón
 * (leída antes de crear este hook) — no se tocó para no arriesgar código
 * ya probado de la Fase 2.
 */
export function useSesion() {
  const [sesion, setSesion] = useState<SesionLocal | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    getSession().then((s) => {
      if (!cancelado) {
        setSesion(s);
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return { sesion, cargando };
}
