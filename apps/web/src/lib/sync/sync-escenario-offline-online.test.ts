import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { enqueue, getPendientes } from './queue';
import { SyncProcessor } from './processor';

describe('RNF-05 — Escenario Real de Sincronización en Campo (Offline ➡️ Online)', () => {
  beforeEach(async () => {
    await db.open();
    await db.cola_sync.clear();
    await db.sesion.put({
      id: 1,
      accessToken: 'token-tecnico-valido',
      expiresAt: Date.now() + 3_600_000,
      usuario: { id: 'usr-tec-1', nombreCompleto: 'Técnico de Campo', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
  });

  afterEach(async () => {
    await db.cola_sync.clear();
    await db.delete();
  });

  it('flujo completo: acumula operaciones sin conexión y las sincroniza ordenadamente al recuperar conectividad', async () => {
    const llamadasRecibidas: string[] = [];
    const payloadsRecibidos: Record<string, unknown>[] = [];

    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/eval-100/iniciar', async ({ request }) => {
        llamadasRecibidas.push('INICIAR_EVALUACION');
        expect(request.headers.get('Authorization')).toBe('Bearer token-tecnico-valido');
        return HttpResponse.json({ id: 'eval-100', estado: 'En_Curso' });
      }),
      http.post('http://localhost:3000/api/v1/evaluaciones/eval-100/respuestas', async ({ request }) => {
        llamadasRecibidas.push('RESPUESTAS');
        const body = (await request.json()) as Record<string, unknown>;
        payloadsRecibidos.push(body);
        return HttpResponse.json({ guardados: 2 });
      }),
      http.post('http://localhost:3000/api/v1/evidencias', async ({ request }) => {
        llamadasRecibidas.push('EVIDENCIA');
        expect(request.headers.get('Authorization')).toBe('Bearer token-tecnico-valido');
        return HttpResponse.json({ id: 'ev-gps-1', mensaje: 'Evidencia recibida' });
      }),
      http.post('http://localhost:3000/api/v1/evaluaciones/eval-100/finalizar', async ({ request }) => {
        llamadasRecibidas.push('FINALIZAR_EVALUACION');
        const body = (await request.json()) as Record<string, unknown>;
        payloadsRecibidos.push(body);
        return HttpResponse.json({ id: 'eval-100', estado: 'Completada', bloqueada: true });
      }),
      http.post('http://localhost:3000/api/v1/informes', async ({ request }) => {
        llamadasRecibidas.push('GENERAR_INFORME');
        const body = (await request.json()) as Record<string, unknown>;
        payloadsRecibidos.push(body);
        return HttpResponse.json({ id: 'inf-100', evaluacionId: 'eval-100' });
      }),
    );

    // 1. FASE OFFLINE: El técnico realiza la inspección en planta sin red
    const idIniciar = await enqueue('INICIAR_EVALUACION', { evaluacionServerId: 'eval-100' });
    const idRespuestas = await enqueue('RESPUESTAS', {
      evaluacionServerId: 'eval-100',
      respuestas: [
        { itemId: 'item-1-1', codigoOpcion: 'C', observacion: 'Pisos limpios' },
        { itemId: 'item-1-2', codigoOpcion: 'CP', observacion: 'Falta rotulación en área de lavado' },
      ],
    });
    const idEvidencia = await enqueue('EVIDENCIA', {
      evaluacionId: 'eval-100',
      respuestaItemId: 'item-1-2',
      tipo: 'DOCUMENTO',
      latitud: 18.4861,
      longitud: -69.9312,
      nombreArchivo: 'criterio_item-1-2_gps.geojson',
      blob: new Blob([JSON.stringify({ type: 'Point', coordinates: [-69.9312, 18.4861] })], {
        type: 'application/geo+json',
      }),
    });
    const idFinalizar = await enqueue('FINALIZAR_EVALUACION', {
      evaluacionServerId: 'eval-100',
      observacionesFinales: 'Inspección completada con éxito en planta.',
    });
    const idInforme = await enqueue('GENERAR_INFORME', {
      evaluacionServerId: 'eval-100',
    });

    // 2. VERIFICACIÓN OFFLINE: Todo debe estar en cola_sync en estado pendiente
    const pendientesOffline = await getPendientes();
    expect(pendientesOffline).toHaveLength(5);
    expect(pendientesOffline.map((op) => op.tipo)).toEqual([
      'INICIAR_EVALUACION',
      'RESPUESTAS',
      'EVIDENCIA',
      'FINALIZAR_EVALUACION',
      'GENERAR_INFORME',
    ]);
    expect(llamadasRecibidas).toHaveLength(0); // Cero llamadas al servidor mientras estuvo offline

    // 3. FASE RECONEXIÓN: El dispositivo detecta internet y procesa la cola
    const processor = new SyncProcessor();
    const syncListener = vi.fn();
    window.addEventListener('sync:actualizado', syncListener);

    await processor.procesarCola();

    // 4. VERIFICACIÓN ONLINE:
    // El orden de ejecución debe ser exactamente FIFO según el flujo operativo
    expect(llamadasRecibidas).toEqual([
      'INICIAR_EVALUACION',
      'RESPUESTAS',
      'EVIDENCIA',
      'FINALIZAR_EVALUACION',
      'GENERAR_INFORME',
    ]);

    // Todas las operaciones deben estar en estado 'enviado' en IndexedDB
    const opIniciar = await db.cola_sync.get(idIniciar);
    const opRespuestas = await db.cola_sync.get(idRespuestas);
    const opEvidencia = await db.cola_sync.get(idEvidencia);
    const opFinalizar = await db.cola_sync.get(idFinalizar);
    const opInforme = await db.cola_sync.get(idInforme);

    expect(opIniciar?.estado).toBe('enviado');
    expect(opRespuestas?.estado).toBe('enviado');
    expect(opEvidencia?.estado).toBe('enviado');
    expect(opFinalizar?.estado).toBe('enviado');
    expect(opInforme?.estado).toBe('enviado');

    // La cola de pendientes activos debe quedar completamente vacía (0)
    const pendientesRestantes = await getPendientes();
    expect(pendientesRestantes).toHaveLength(0);

    // Se disparó el evento de notificación a la UI
    expect(syncListener).toHaveBeenCalled();

    window.removeEventListener('sync:actualizado', syncListener);
  });

  it('resiliencia ante falla parcial: si un ítem falla con 500, detiene reintento inmediato mediante backoff sin perder datos', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/eval-200/iniciar', () =>
        HttpResponse.json({ estado: 'En_Curso' })
      ),
      http.post('http://localhost:3000/api/v1/evaluaciones/eval-200/respuestas', () =>
        new HttpResponse('Error interno momentáneo', { status: 500 })
      ),
    );

    const idIniciar = await enqueue('INICIAR_EVALUACION', { evaluacionServerId: 'eval-200' });
    const idRespuestas = await enqueue('RESPUESTAS', {
      evaluacionServerId: 'eval-200',
      respuestas: [{ itemId: 'item-2', codigoOpcion: 'C' }],
    });

    const processor = new SyncProcessor();
    await processor.procesarCola();

    // La primera operación tuvo éxito
    const opIniciar = await db.cola_sync.get(idIniciar);
    expect(opIniciar?.estado).toBe('enviado');

    // La segunda operación falló con HTTP 500, incrementó intentos y quedó pendiente con mensaje de error
    const opRespuestas = await db.cola_sync.get(idRespuestas);
    expect(opRespuestas?.estado).toBe('pendiente');
    expect(opRespuestas?.intentos).toBe(1);
    expect(opRespuestas?.errorMsg).toBe('HTTP 500');

    // Si volvemos a procesar de inmediato sin haber transcurrido el tiempo de backoff, no se reenvía prematuramente
    await processor.procesarCola();
    const opRespuestasTrasIntento = await db.cola_sync.get(idRespuestas);
    expect(opRespuestasTrasIntento?.intentos).toBe(1); // Sigue en 1 porque está bajo ventana de backoff
  });
});
