import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { useCalendario } from './useCalendario';

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

  it('propaga el 400 real que devuelve el backend cuando falta evaluadorId', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', () =>
        HttpResponse.json({ message: 'Debe indicar el parámetro evaluadorId.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useCalendario('2'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Debe indicar el parámetro evaluadorId.');
  });
});
