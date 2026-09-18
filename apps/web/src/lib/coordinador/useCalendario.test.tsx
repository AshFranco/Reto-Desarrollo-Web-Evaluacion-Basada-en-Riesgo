import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { useCalendario, useCalendarioEquipo, useReprogramarEvaluacion } from './useCalendario';
import { MOCK_CALENDARIO_EQUIPO } from '@/mocks/handlers';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCalendario', () => {
  it('no hace la petición si no se pasa evaluadorId', async () => {
    const { result } = renderHook(() => useCalendario(undefined), { wrapper: crearWrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('llama a GET /api/v1/calendario?evaluadorId=X cuando se pasa un evaluadorId', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', ({ request }) => {
        urlRecibida = request.url;
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useCalendario('2'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).toContain('evaluadorId=2');
  });

  it('arma el query string con desde/hasta además de evaluadorId', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', ({ request }) => {
        urlRecibida = request.url;
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(
      () => useCalendario('2', { desde: '2026-01-01', hasta: '2026-01-31' }),
      { wrapper: crearWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).toContain('evaluadorId=2');
    expect(urlRecibida).toContain('desde=2026-01-01');
    expect(urlRecibida).toContain('hasta=2026-01-31');
  });

  it('propaga el error real del backend tal cual', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', () =>
        HttpResponse.json({ message: 'No tiene permisos para esta operación.' }, { status: 403 })
      )
    );

    const { result } = renderHook(() => useCalendario('2'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('No tiene permisos para esta operación.');
  });
});

describe('useCalendarioEquipo', () => {
  it('llama a GET /api/v1/calendario SIN evaluadorId y devuelve el calendario agrupado por técnico', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', ({ request }) => {
        urlRecibida = request.url;
        return HttpResponse.json(MOCK_CALENDARIO_EQUIPO);
      })
    );

    const { result } = renderHook(() => useCalendarioEquipo(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).not.toContain('evaluadorId');
    expect(result.current.data).toEqual(MOCK_CALENDARIO_EQUIPO);
  });

  it('hace la petición apenas se monta, sin esperar ningún parámetro (confirmado en vivo: ya no da 400 sin evaluadorId)', async () => {
    const { result } = renderHook(() => useCalendarioEquipo(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).not.toBe('idle'));
  });

  it('arma el query string con desde/hasta cuando se pasan', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', ({ request }) => {
        urlRecibida = request.url;
        return HttpResponse.json(MOCK_CALENDARIO_EQUIPO);
      })
    );

    const { result } = renderHook(() => useCalendarioEquipo({ desde: '2026-01-01', hasta: '2026-01-31' }), {
      wrapper: crearWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).toContain('desde=2026-01-01');
    expect(urlRecibida).toContain('hasta=2026-01-31');
  });
});

describe('useReprogramarEvaluacion', () => {
  it('manda nuevaFecha y comentario al PATCH /calendario/:id/reprogramar', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/calendario/:id/reprogramar', async ({ request, params }) => {
        cuerpoRecibido = await request.json();
        expect(params.id).toBe('1');
        return HttpResponse.json({ mensaje: 'Evaluación reprogramada exitosamente.' });
      })
    );

    const { result } = renderHook(() => useReprogramarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', nuevaFecha: '2026-04-01', comentario: 'Reagendado a pedido del establecimiento' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({
      nuevaFecha: '2026-04-01',
      comentario: 'Reagendado a pedido del establecimiento',
    });
  });

  it('manda comentario undefined cuando no se completa', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/calendario/:id/reprogramar', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ mensaje: 'Evaluación reprogramada exitosamente.' });
      })
    );

    const { result } = renderHook(() => useReprogramarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', nuevaFecha: '2026-04-01' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ nuevaFecha: '2026-04-01', comentario: undefined });
  });

  it('propaga el error real del backend (ej. evaluación no encontrada)', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/calendario/:id/reprogramar', () =>
        HttpResponse.json({ message: 'Evaluación no encontrada.' }, { status: 404 })
      )
    );

    const { result } = renderHook(() => useReprogramarEvaluacion(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '999', nuevaFecha: '2026-04-01' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Evaluación no encontrada.');
  });
});
