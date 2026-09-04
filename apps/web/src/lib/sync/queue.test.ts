import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { enqueue, getPendientes, marcarEnviada, marcarError } from './queue';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('queue', () => {
  it('enqueue agrega operación con estado pendiente', async () => {
    const uuid = await enqueue('RESPUESTAS', { evaluacionId: '42' });
    const op = await db.cola_sync.get(uuid);
    expect(op?.estado).toBe('pendiente');
    expect(op?.intentos).toBe(0);
    expect(op?.tipo).toBe('RESPUESTAS');
  });

  it('enqueue genera UUID único cada vez', async () => {
    const a = await enqueue('RESPUESTAS', {});
    const b = await enqueue('RESPUESTAS', {});
    expect(a).not.toBe(b);
  });

  it('getPendientes devuelve solo ops pendiente, ordenadas por timestamp', async () => {
    const u1 = await enqueue('INICIAR_EVALUACION', {});
    const u2 = await enqueue('RESPUESTAS', {});
    const ops = await getPendientes();
    expect(ops.map(o => o.uuidLocal)).toEqual([u1, u2]);
    expect(ops.every(o => o.estado === 'pendiente')).toBe(true);
  });

  it('marcarEnviada pone estado enviado', async () => {
    const uuid = await enqueue('RESPUESTAS', {});
    await marcarEnviada(uuid);
    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });

  it('marcarError incrementa intentos y guarda mensaje', async () => {
    const uuid = await enqueue('RESPUESTAS', {});
    await marcarError(uuid, 'timeout');
    const op = await db.cola_sync.get(uuid);
    expect(op?.intentos).toBe(1);
    expect(op?.errorMsg).toBe('timeout');
    expect(op?.estado).toBe('pendiente');
  });

  it('marcarError tras 10 intentos pone estado error', async () => {
    const uuid = await enqueue('RESPUESTAS', {});
    for (let i = 0; i < 10; i++) await marcarError(uuid, 'fallo');
    expect((await db.cola_sync.get(uuid))?.estado).toBe('error');
  });
});
