import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});

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

  it('FINALIZAR_EVALUACION por sí solo NO llama a POST /informes -- generar el informe es una operación aparte', async () => {
    let seLlamoInformes = false;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/finalizar', () => HttpResponse.json({ idEstado: 3 })),
      http.post('http://localhost:3000/api/v1/informes', () => {
        seLlamoInformes = true;
        return HttpResponse.json({ id: '1' }, { status: 201 });
      })
    );

    const uuid = await enqueue('FINALIZAR_EVALUACION', { evaluacionServerId: '42', observacionesFinales: undefined });
    const proc = new SyncProcessor();
    await proc.procesarCola();

    expect(seLlamoInformes).toBe(false);
    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });

  it('reintenta GENERAR_INFORME encolado hasta que el backend lo acepta', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/informes', () => HttpResponse.json({ id: '1' }, { status: 201 }))
    );

    const uuid = await enqueue('GENERAR_INFORME', { evaluacionServerId: '42' });
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

  it('procesarCola(true) fuerza la sincronización ignorando el backoff programado', async () => {
    let intentosServidor = 0;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => {
        intentosServidor++;
        if (intentosServidor === 1) {
          return new HttpResponse('Falla transitoria', { status: 503 });
        }
        return HttpResponse.json({ procesadas: 1 });
      })
    );

    const uuid = await enqueue('RESPUESTAS', {
      evaluacionServerId: '42',
      respuestas: [{ itemId: '1', codigoOpcion: 'C' }],
    });

    const proc = new SyncProcessor();

    // Primer intento: falla con 503 y fija un backoff futuro
    await proc.procesarCola();
    expect((await db.cola_sync.get(uuid))?.estado).toBe('pendiente');
    expect((await db.cola_sync.get(uuid))?.intentos).toBe(1);

    // Segundo intento normal inmediato: se salta por el backoff
    await proc.procesarCola(false);
    expect(intentosServidor).toBe(1); // No llamó al servidor

    // Tercer intento forzado (usuario pulsa Sincronizar): limpia backoff y envía
    await proc.procesarCola(true);
    expect(intentosServidor).toBe(2);
    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });
  describe('sin conexión (las fallas de red no deben agotar los reintentos)', () => {
    const urlEvidencias = 'http://localhost:3000/api/v1/evidencias';
    const encolarEvidencia = () =>
      enqueue('EVIDENCIA', {
        evaluacionId: '1', tipo: 'DOCUMENTO', latitud: 18.5, longitud: -69.9,
        blob: new Blob(['{}'], { type: 'application/geo+json' }), nombreArchivo: 'geo.geojson',
      });

    it('una operación encolada sin red durante mucho tiempo se sigue enviando al volver internet', async () => {
      let online = false;
      let subidas = 0;
      server.use(
        http.post(urlEvidencias, () => {
          if (!online) return HttpResponse.error();
          subidas++;
          return HttpResponse.json({ id: 'ev-1' });
        })
      );
      const uuid = await encolarEvidencia();
      const proc = new SyncProcessor();
      let ahora = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => ahora);

      // 60 minutos con el ciclo automático de 30 s y sin red: antes agotaba los 10 intentos.
      for (let i = 0; i < 120; i++) {
        await proc.procesarCola();
        ahora += 30_000;
      }
      expect((await db.cola_sync.get(uuid))?.estado).toBe('pendiente');
      expect((await db.cola_sync.get(uuid))?.intentos).toBe(0);

      online = true;
      await proc.procesarCola();
      expect(subidas).toBe(1);
      expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
    }, 60_000);

    it('un rechazo real del servidor sí consume intentos', async () => {
      server.use(http.post(urlEvidencias, () => HttpResponse.json({ message: 'Error' }, { status: 500 })));
      const uuid = await encolarEvidencia();
      await new SyncProcessor().procesarCola();
      expect((await db.cola_sync.get(uuid))?.intentos).toBe(1);
    });

    it('no intenta enviar mientras el navegador reporta que no hay conexión', async () => {
      let llamadas = 0;
      server.use(http.post(urlEvidencias, () => { llamadas++; return HttpResponse.json({ id: 'ev-1' }); }));
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const uuid = await encolarEvidencia();

      await new SyncProcessor().procesarCola();

      expect(llamadas).toBe(0);
      expect((await db.cola_sync.get(uuid))?.intentos).toBe(0);
      expect((await db.cola_sync.get(uuid))?.estado).toBe('pendiente');
    });
  });

  describe('operaciones que quedaron en error', () => {
    it('el ciclo automático no las reintenta, pero Sincronizar (forzado) sí', async () => {
      let llamadas = 0;
      server.use(
        http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => {
          llamadas++;
          return HttpResponse.json({ procesadas: 1 });
        })
      );
      const uuid = await enqueue('RESPUESTAS', { evaluacionServerId: '42', respuestas: [{ itemId: '1', codigoOpcion: 'C' }] });
      await db.cola_sync.update(uuid, { estado: 'error', intentos: 10, errorMsg: 'HTTP 500' });
      const proc = new SyncProcessor();

      await proc.procesarCola();
      expect(llamadas).toBe(0);
      expect((await db.cola_sync.get(uuid))?.estado).toBe('error');

      await proc.procesarCola(true);
      expect(llamadas).toBe(1);
      expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
    });

    it('si el servidor sigue rechazándola, vuelve a quedar en error tras los 10 intentos y no se pierde', async () => {
      server.use(
        http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () =>
          HttpResponse.json({ message: 'Error' }, { status: 500 })
        )
      );
      const uuid = await enqueue('RESPUESTAS', { evaluacionServerId: '42', respuestas: [] });
      await db.cola_sync.update(uuid, { estado: 'error', intentos: 10 });
      const proc = new SyncProcessor();

      for (let i = 0; i < 10; i++) await proc.procesarCola(true);

      const op = await db.cola_sync.get(uuid);
      expect(op?.estado).toBe('error');
      expect(op?.intentos).toBe(10);
    });
  });

});
