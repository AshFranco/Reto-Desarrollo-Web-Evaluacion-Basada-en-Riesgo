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
  it('llama a GET /api/v1/calendario sin parámetros cuando no se pasa rango', async () => {
    const { result } = renderHook(() => useCalendario(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('arma el query string con desde/hasta cuando se pasa un rango', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', ({ request }) => {
        urlRecibida = request.url;
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useCalendario({ desde: '2026-01-01', hasta: '2026-01-31' }), {
      wrapper: crearWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).toContain('desde=2026-01-01');
    expect(urlRecibida).toContain('hasta=2026-01-31');
  });

  it('propaga el 403 real que devuelve el backend cuando lo llama un rol distinto de Técnico Evaluador', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/calendario', () =>
        HttpResponse.json({ message: 'No tiene permisos para esta operación.' }, { status: 403 })
      )
    );

    const { result } = renderHook(() => useCalendario(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('No tiene permisos para esta operación.');
  });
});
