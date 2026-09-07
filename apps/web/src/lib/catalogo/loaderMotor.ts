import { db } from '@/lib/db';
import type { CatalogoMotorLocal } from '@/lib/db';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function descargarCatalogoMotor(): Promise<void> {
  const sesion = await db.sesion.get(1);
  const headers: Record<string, string> = {};
  if (sesion) headers['Authorization'] = `Bearer ${sesion.accessToken}`;

  const res = await fetch(`${API_BASE}/api/v1/motor-riesgo/catalogo`, { headers });
  if (!res.ok) throw new Error(`Error al descargar catálogo del motor: ${res.status}`);

  const data = await res.json();

  const registro: CatalogoMotorLocal = {
    id: 1,
    idVersionFicha: data.idVersionFicha,
    idVersionMatriz: data.idVersionMatriz,
    descargadoEn: Date.now(),
    reglaAprobacion: data.reglaAprobacion,
    factores: data.factores,
    rangosCalificacion: data.rangosCalificacion,
    rangosFrecuencia: data.rangosFrecuencia,
  };

  await db.catalogo_motor.put(registro);
}
