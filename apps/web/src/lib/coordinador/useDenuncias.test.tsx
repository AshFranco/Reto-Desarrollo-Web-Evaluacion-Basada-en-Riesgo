import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { MOCK_DENUNCIA } from '@/mocks/handlers';
import { useDenuncias, useCrearDenuncia, useResolverDenuncia } from './useDenuncias';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDenuncias', () => {
  it('devuelve la lista de denuncias', async () => {
    const { result } = renderHook(() => useDenuncias(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_DENUNCIA]);
  });
});

describe('useCrearDenuncia', () => {
  it('NO manda el campo denunciante cuando se omite (denuncia anónima)', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_DENUNCIA, { status: 201 });
      })
    );

    const { result } = renderHook(() => useCrearDenuncia(), { wrapper: crearWrapper() });
    result.current.mutate({ fechaRecepcion: '2026-03-01' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ fechaRecepcion: '2026-03-01' });
  });

  it('manda el denunciante cuando se completa (denuncia no anónima)', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_DENUNCIA, { status: 201 });
      })
    );

    const { result } = renderHook(() => useCrearDenuncia(), { wrapper: crearWrapper() });
    result.current.mutate({ fechaRecepcion: '2026-03-01', denunciante: 'Juan Vecino' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ fechaRecepcion: '2026-03-01', denunciante: 'Juan Vecino' });
  });
});

describe('useResolverDenuncia', () => {
  it('acepta las 3 decisiones posibles: PROCEDE, NO_PROCEDE, REMISION', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/denuncias/:id/resolver', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ ...MOCK_DENUNCIA, resultado: 'REMISION' });
      })
    );

    const { result } = renderHook(() => useResolverDenuncia(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', resultado: 'REMISION' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ resultado: 'REMISION' });
  });

  it('propaga el error cuando la denuncia no tiene establecimiento asociado', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/denuncias/:id/resolver', () =>
        HttpResponse.json(
          { message: 'La denuncia debe tener un establecimiento asociado para generar el caso.' },
          { status: 400 }
        )
      )
    );

    const { result } = renderHook(() => useResolverDenuncia(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', resultado: 'PROCEDE' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      'La denuncia debe tener un establecimiento asociado para generar el caso.'
    );
  });
});
