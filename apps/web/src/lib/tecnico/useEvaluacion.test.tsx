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
});
