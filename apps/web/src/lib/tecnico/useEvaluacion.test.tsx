import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_EVALUACION_DETALLE } from '@/mocks/handlers';
import { db } from '@/lib/db';
import {
  useEvaluacionDetalle,
  useIniciarEvaluacion,
  useResponderItem,
  useFinalizarEvaluacion,
  useGenerarInforme,
  useObservacionesEvaluacion,
  useCorregirEvaluacion,
} from './useEvaluacion';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useEvaluacionDetalle', () => {
  it('devuelve el detalle de la evaluación', async () => {
    const { result } = renderHook(() => useEvaluacionDetalle('1'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_EVALUACION_DETALLE);
  });

  it('no hace la petición si no se pasa evaluacionId', async () => {
    const { result } = renderHook(() => useEvaluacionDetalle(undefined), { wrapper: crearWrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useIniciarEvaluacion', () => {
  it('llama a POST /evaluaciones/:id/iniciar', async () => {
    const { result } = renderHook(() => useIniciarEvaluacion(), { wrapper: crearWrapper() });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('propaga el error real cuando la evaluación ya fue iniciada', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/iniciar', () =>
        HttpResponse.json({ message: 'La evaluación ya fue iniciada o finalizada.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useIniciarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('La evaluación ya fue iniciada o finalizada.');
  });

  it('sin conexión, encola en vez de fallar', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/iniciar', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useIniciarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const pendientes = await db.cola_sync.where('tipo').equals('INICIAR_EVALUACION').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toEqual({ evaluacionServerId: '1' });
    expect(pendientes[0]?.estado).toBe('pendiente');
  });
});

describe('useResponderItem', () => {
  it('manda un solo item dentro del array respuestas', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ mensaje: 'Avance guardado.' });
      })
    );

    const { result } = renderHook(() => useResponderItem(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', itemId: '2', codigoOpcion: 'C' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });
  });

  it('incluye nivelCriticidad y observacion cuando se pasan', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ mensaje: 'Avance guardado.' });
      })
    );

    const { result } = renderHook(() => useResponderItem(), { wrapper: crearWrapper() });
    result.current.mutate({
      evaluacionId: '1',
      itemId: '3',
      codigoOpcion: 'IT',
      nivelCriticidad: 'C',
      observacion: 'Sin control de temperatura',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({
      respuestas: [{ itemId: '3', codigoOpcion: 'IT', nivelCriticidad: 'C', observacion: 'Sin control de temperatura' }],
    });
  });

  it('propaga el error real cuando falta la criticidad en un hallazgo', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () =>
        HttpResponse.json(
          { message: 'Debe indicar el nivel de criticidad (C/M/Me) para el ítem con hallazgo: 3' },
          { status: 400 }
        )
      )
    );

    const { result } = renderHook(() => useResponderItem(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', itemId: '3', codigoOpcion: 'IT' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      'Debe indicar el nivel de criticidad (C/M/Me) para el ítem con hallazgo: 3'
    );
  });

  it('sin conexión, encola la respuesta en vez de perderla', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useResponderItem(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', itemId: '2', codigoOpcion: 'C' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const pendientes = await db.cola_sync.where('tipo').equals('RESPUESTAS').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toEqual({
      evaluacionServerId: '1',
      respuestas: [{ itemId: '2', codigoOpcion: 'C' }],
    });
    expect(pendientes[0]?.estado).toBe('pendiente');
  });
});

describe('useFinalizarEvaluacion', () => {
  it('llama a POST /evaluaciones/:id/finalizar', async () => {
    const { result } = renderHook(() => useFinalizarEvaluacion(), { wrapper: crearWrapper() });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('propaga el error real cuando faltan respuestas', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/finalizar', () =>
        HttpResponse.json({ message: 'Faltan respuestas: 40/45 ítems respondidos.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useFinalizarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Faltan respuestas: 40/45 ítems respondidos.');
  });

  it('sin conexión, encola en vez de fallar', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/finalizar', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useFinalizarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const pendientes = await db.cola_sync.where('tipo').equals('FINALIZAR_EVALUACION').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toEqual({ evaluacionServerId: '1' });
    expect(pendientes[0]?.estado).toBe('pendiente');
  });

  it('NO encadena POST /informes -- finalizar() queda como paso independiente (generar informe es un botón aparte)', async () => {
    let seLlamoInformes = false;
    server.use(
      http.post('http://localhost:3000/api/v1/informes', () => {
        seLlamoInformes = true;
        return HttpResponse.json({ id: '1', idEvaluacion: '1' }, { status: 201 });
      })
    );

    const { result } = renderHook(() => useFinalizarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seLlamoInformes).toBe(false);
  });
});

describe('useGenerarInforme', () => {
  it('llama a POST /informes y pasa la evaluación a EN_REVISION', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/informes', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ id: '1', idEvaluacion: '1' }, { status: 201 });
      })
    );

    const { result } = renderHook(() => useGenerarInforme(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ evaluacionId: '1' });
  });

  it('propaga el error real si el backend rechaza la generación del informe', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/informes', () =>
        HttpResponse.json({ message: 'Solo se puede generar el informe de una evaluación finalizada.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useGenerarInforme(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Solo se puede generar el informe de una evaluación finalizada.');
  });

  it('sin conexión, encola GENERAR_INFORME en vez de fallar', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/informes', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useGenerarInforme(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const pendientes = await db.cola_sync.where('tipo').equals('GENERAR_INFORME').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toEqual({ evaluacionServerId: '1' });
    expect(pendientes[0]?.estado).toBe('pendiente');
  });
});

describe('useObservacionesEvaluacion', () => {
  it('devuelve el historial de observaciones de la evaluación', async () => {
    const { result } = renderHook(() => useObservacionesEvaluacion('1'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      codigoEstado: 'DEVUELTA',
      usuario: 'Coordinador Ejemplo',
    });
  });

  it('no hace la petición si no se pasa evaluacionId', async () => {
    const { result } = renderHook(() => useObservacionesEvaluacion(undefined), { wrapper: crearWrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCorregirEvaluacion', () => {
  it('llama a PATCH /evaluaciones/:id/corregir con las respuestas', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/evaluaciones/:id/corregir', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({
          mensaje: 'Correcciones registradas exitosamente.',
          evaluacion: { ...MOCK_EVALUACION_DETALLE, bloqueada: false },
        });
      })
    );

    const { result } = renderHook(() => useCorregirEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });
  });

  it('propaga el error real si el backend rechaza la corrección', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/evaluaciones/:id/corregir', () =>
        HttpResponse.json({ message: 'Debe indicar el nivel de criticidad (C/M/Me).' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useCorregirEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', respuestas: [{ itemId: '3', codigoOpcion: 'IT' }] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Debe indicar el nivel de criticidad (C/M/Me).');
  });
});
