import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_TECNICO } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useTecnicos } from './useTecnicos';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTecnicos', () => {
  it('devuelve la lista de técnicos evaluadores', async () => {
    const { result } = renderHook(() => useTecnicos(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_TECNICO]);
  });

  it('llama a GET /api/v1/usuarios/por-rol/TECNICO_EVALUADOR', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/usuarios/por-rol/:codigoRol', ({ request, params }) => {
        urlRecibida = request.url;
        expect(params.codigoRol).toBe('TECNICO_EVALUADOR');
        return HttpResponse.json([MOCK_TECNICO]);
      })
    );

    const { result } = renderHook(() => useTecnicos(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).toContain('/usuarios/por-rol/TECNICO_EVALUADOR');
  });

  it('propaga el error cuando el rol no tiene permiso', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/usuarios/por-rol/:codigoRol', () =>
        HttpResponse.json({ message: 'No tiene permisos para esta operación.' }, { status: 403 })
      )
    );

    const { result } = renderHook(() => useTecnicos(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('No tiene permisos para esta operación.');
  });
});
