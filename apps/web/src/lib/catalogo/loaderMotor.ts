import { db } from '@/lib/db';
import type { EntradaCalculo } from '@ebr/risk-engine';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function descargarCatalogoMotor(): Promise<void> {
  const sesion = await db.sesion.get(1);
  const headers: Record<string, string> = {};
  if (sesion) headers['Authorization'] = `Bearer ${sesion.accessToken}`;

  const res = await fetch(`${API_BASE}/api/v1/motor-riesgo/catalogo`, { headers });
  if (!res.ok) throw new Error(`Error al descargar catálogo del motor de riesgo: ${res.status}`);

  const datos: Omit<EntradaCalculo, 'respuestas'> = await res.json();

  await db.catalogo_motor.put({
    id: 1,
    descargadoEn: Date.now(),
    datos,
  });
}
