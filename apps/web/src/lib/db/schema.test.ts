import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './index';

beforeEach(async () => { await db.open(); });
afterEach(async () => { await db.delete(); });

describe('EbrDatabase schema', () => {
  it('tiene las 8 tablas esperadas', () => {
    const tablas = db.tables.map(t => t.name).sort();
    expect(tablas).toEqual([
      'asignacion', 'catalogo_item', 'catalogo_meta',
      'cola_sync', 'evaluacion', 'evidencia', 'respuesta', 'sesion',
    ].sort());
  });

  it('puede escribir y leer de sesion', async () => {
    await db.sesion.put({
      id: 1,
      accessToken: 'tok',
      expiresAt: Date.now() + 900_000,
      usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
    const s = await db.sesion.get(1);
    expect(s?.accessToken).toBe('tok');
  });

  it('puede escribir y leer de cola_sync', async () => {
    const uuid = crypto.randomUUID();
    await db.cola_sync.add({
      uuidLocal: uuid,
      tipo: 'RESPUESTAS',
      payload: { evaluacionId: '42' },
      timestamp: Date.now(),
      intentos: 0,
      estado: 'pendiente',
    });
    const op = await db.cola_sync.get(uuid);
    expect(op?.estado).toBe('pendiente');
  });
});
