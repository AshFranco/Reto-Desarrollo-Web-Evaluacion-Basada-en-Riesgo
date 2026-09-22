import { db } from '@/lib/db';
import { flattenSecciones } from './flatten';
import type { FormularioVigenteResponse } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function descargarCatalogo(): Promise<void> {
  const sesion = await db.sesion.get(1);
  const headers: Record<string, string> = {};
  if (sesion) headers['Authorization'] = `Bearer ${sesion.accessToken}`;

  const res = await fetch(`${API_BASE}/api/v1/formularios/vigente`, { headers });
  if (!res.ok) throw new Error(`Error al descargar catálogo: ${res.status}`);

  const data: FormularioVigenteResponse = await res.json();

  const itemsPlanos = flattenSecciones(data.secciones, data.id);

  await db.transaction('rw', [db.catalogo_item, db.catalogo_meta], async () => {
    await db.catalogo_item.clear();
    await db.catalogo_item.bulkPut(itemsPlanos);

    await db.catalogo_meta.put({
      id: 1,
      versionFichaId: data.id,
      descargadoEn: Date.now(),
      opcionesRespuesta: data.opcionesRespuesta,
    });
  });
}

export async function necesitaActualizar(versionServidor: string): Promise<boolean> {
  const meta = await db.catalogo_meta.get(1);
  if (!meta) return true;
  return meta.versionFichaId !== versionServidor;
}
