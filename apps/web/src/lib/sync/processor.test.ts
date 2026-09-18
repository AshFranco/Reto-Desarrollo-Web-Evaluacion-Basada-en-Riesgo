import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { enqueue } from './queue';
import { SyncProcessor, construirFormEvidencia } from './processor';

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

  it('envía evidencia encolada (tipo DOCUMENTO con GPS) y la marca como enviada', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evidencias', () => HttpResponse.json({ id: 'ev-1' }))
    );

    const uuid = await enqueue('EVIDENCIA', {
      evaluacionId: '42',
      tipo: 'DOCUMENTO',
      blob: new Blob(['contenido'], { type: 'application/geo+json' }),
      nombreArchivo: 'gps.geojson',
      latitud: 18.4861,
      longitud: -69.9312,
    });

    const proc = new SyncProcessor();
    await proc.procesarCola();

    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });

  describe('construirFormEvidencia', () => {
    it('usa el tipo real del payload, no un FOTO fijo', () => {
      const form = construirFormEvidencia({ evaluacionId: '42', tipo: 'DOCUMENTO' });
      expect(form.get('tipo')).toBe('DOCUMENTO');
    });

    it('cae a FOTO si no se especifica tipo', () => {
      const form = construirFormEvidencia({ evaluacionId: '42' });
      expect(form.get('tipo')).toBe('FOTO');
    });

    it('incluye latitud y longitud cuando vienen en el payload', () => {
      const form = construirFormEvidencia({
        evaluacionId: '42', tipo: 'FOTO', latitud: 18.4861, longitud: -69.9312,
      });
      expect(form.get('latitud')).toBe('18.4861');
      expect(form.get('longitud')).toBe('-69.9312');
    });

    it('no incluye latitud/longitud si no vienen en el payload', () => {
      const form = construirFormEvidencia({ evaluacionId: '42', tipo: 'FOTO' });
      expect(form.get('latitud')).toBeNull();
      expect(form.get('longitud')).toBeNull();
    });

    it('incluye respuestaItemId solo si viene en el payload', () => {
      const conItem = construirFormEvidencia({ evaluacionId: '42', respuestaItemId: '226' });
      expect(conItem.get('respuestaItemId')).toBe('226');
      const sinItem = construirFormEvidencia({ evaluacionId: '42' });
      expect(sinItem.get('respuestaItemId')).toBeNull();
    });

    it('adjunta el blob con el nombre de archivo dado', () => {
      const blob = new Blob(['contenido'], { type: 'image/jpeg' });
      const form = construirFormEvidencia({ evaluacionId: '42', tipo: 'FOTO', blob, nombreArchivo: 'foto.jpg' });
      const archivo = form.get('archivo') as File;
      expect(archivo.name).toBe('foto.jpg');
      expect(archivo.type).toBe('image/jpeg');
    });
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
