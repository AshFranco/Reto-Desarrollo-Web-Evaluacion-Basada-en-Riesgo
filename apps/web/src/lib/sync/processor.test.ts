import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { enqueue } from './queue';
import { SyncProcessor } from './processor';

beforeEach(async () => {
  await db.open();
  await db.sesion.put({
    id: 1, accessToken: 'tok', expiresAt: Date.now() + 900_000,
    usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
  });
});
afterEach(() => db.delete());

describe('SyncProcessor', () => {
  it('calcularBackoff es exponencial con máximo 300 000 ms', () => {
    const proc = new SyncProcessor();
    expect(proc.calcularBackoff(0)).toBe(1_000);
    expect(proc.calcularBackoff(3)).toBe(8_000);
    expect(proc.calcularBackoff(20)).toBe(300_000);
  });

  it('envía respuestas y las marca como enviadas', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/iniciar', () =>
        HttpResponse.json({ estado: 'En_Curso' })
      ),
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () =>
        HttpResponse.json({ procesadas: 1 })
      ),
    );

    await enqueue('INICIAR_EVALUACION', { evaluacionServerId: '42' });
    const uuid = await enqueue('RESPUESTAS', {
      evaluacionServerId: '42',
      respuestas: [{ itemId: '1', codigoOpcion: 'C' }],
    });

    const proc = new SyncProcessor();
    await proc.procesarCola();

    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });

  it('marca como error tras 10 intentos fallidos', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () =>
        HttpResponse.json({ message: 'Error' }, { status: 500 })
      )
    );
    const uuid = await enqueue('RESPUESTAS', { evaluacionServerId: '99', respuestas: [] });
    await db.cola_sync.update(uuid, { intentos: 9 });

    const proc = new SyncProcessor();
    await proc.procesarCola();

    expect((await db.cola_sync.get(uuid))?.estado).toBe('error');
  });
});
