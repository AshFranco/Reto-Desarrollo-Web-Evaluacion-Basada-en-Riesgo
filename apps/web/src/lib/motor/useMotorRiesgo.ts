import { useMemo } from 'react';
import type { ResultadoRiesgo } from '@ebr/risk-engine';
import type { CatalogoMetaLocal, RespuestaLocal } from '@/lib/db';

interface Params {
  respuestas: RespuestaLocal[];
  catalogoMeta: CatalogoMetaLocal | null;
}

export function useMotorRiesgo({ respuestas, catalogoMeta }: Params): ResultadoRiesgo | null {
  return useMemo(() => {
    if (respuestas.length === 0) return null;
    if (!catalogoMeta) return null;
    // TODO: implementar cuando el backend exponga factores, rangos y reglaAprobacion
    return null;
  }, [respuestas.length, catalogoMeta]);
}
