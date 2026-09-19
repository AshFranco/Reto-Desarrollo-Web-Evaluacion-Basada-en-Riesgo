import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { MOCK_ALERTA_LAPCH } from '@/mocks/handlers';
import { useAlertasLapch, useCrearAlertaLapch, useResolverAlertaLapch } from './useAlertasLapch';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAlertasLapch', () => {
  it('devuelve la lista de alertas', async () => {
    const { result } = renderHook(() => useAlertasLapch(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_ALERTA_LAPCH]);
  });

  it('propaga el error cuando el rol no tiene permiso', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/alertas-lapch', () =>
        HttpResponse.json({ message: 'No tiene permisos para esta operación.' }, { status: 403 })
      )
    );

    const { result } = renderHook(() => useAlertasLapch(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('No tiene permisos para esta operación.');
  });
});

describe('useCrearAlertaLapch', () => {
  it('manda exactamente los campos completados, sin agregar ninguno extra', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/alertas-lapch', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_ALERTA_LAPCH, { status: 201 });
      })
    );

    const { result } = renderHook(() => useCrearAlertaLapch(), { wrapper: crearWrapper() });
    result.current.mutate({ numeroAlerta: 'LAPCH-2026-002', fecha: '2026-03-01' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ numeroAlerta: 'LAPCH-2026-002', fecha: '2026-03-01' });
  });
});

describe('useResolverAlertaLapch', () => {
  it('manda resultado PROCEDE y crea el caso automáticamente en el servidor', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/alertas-lapch/:id/resolver', async ({ request, params }) => {
        cuerpoRecibido = await request.json();
        expect(params.id).toBe('1');
        return HttpResponse.json({ ...MOCK_ALERTA_LAPCH, resultado: 'PROCEDE' });
      })
    );

    const { result } = renderHook(() => useResolverAlertaLapch(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', resultado: 'PROCEDE' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ resultado: 'PROCEDE' });
  });

  it('propaga el error cuando la alerta no tiene establecimiento asociado', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/alertas-lapch/:id/resolver', () =>
        HttpResponse.json(
          { message: 'La alerta debe tener un establecimiento asociado para generar el caso.' },
          { status: 400 }
        )
      )
    );

    const { result } = renderHook(() => useResolverAlertaLapch(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', resultado: 'PROCEDE' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      'La alerta debe tener un establecimiento asociado para generar el caso.'
    );
  });
});
