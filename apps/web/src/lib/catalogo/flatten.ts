import type { NodoCatalogo } from '@/lib/types';
import type { CatalogoItemLocal } from '@/lib/db';

export function flattenSecciones(nodos: NodoCatalogo[], versionFichaId: string): CatalogoItemLocal[] {
  return nodos.flatMap(({ hijos, ...nodo }) => [
    { ...nodo, versionFichaId },
    ...flattenSecciones(hijos, versionFichaId),
  ]);
}
