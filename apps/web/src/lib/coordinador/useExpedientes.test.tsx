import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_CASO_RESUMEN, MOCK_CASO_DETALLE, MOCK_EXPEDIENTE } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useExpedientes, useCasosCerrables, useCerrarExpediente } from './useExpedientes';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useExpedientes', () => {
  it('devuelve la lista de expedientes ya cerrados', async () => {
    const { result } = renderHook(() => useExpedientes(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_EXPEDIENTE]);
  });
});

describe('useCasosCerrables', () => {
  it('incluye un caso con evaluación Aprobada (idEstado 5) y sin expediente todavía', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos', () =>
        HttpResponse.json([{ ...MOCK_CASO_RESUMEN, id: '1', estado: 'Asignado' }])
      ),
      http.get('http://localhost:3000/api/v1/casos/:id', () =>
        HttpResponse.json({
          ...MOCK_CASO_DETALLE,
          id: '1',
          expediente: null,
          evaluaciones: [{ id: '10', idEstado: 5, fechaProgramada: null }],
        })
      )
    );

    const { result } = renderHook(() => useCasosCerrables(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([
      {
        casoId: '1',
        establecimiento: MOCK_CASO_DETALLE.establecimiento.nombre,
        empresa: MOCK_CASO_DETALLE.establecimiento.empresa.razonSocial,
      },
    ]);
  });

  it('no incluye un caso que ya tiene expediente, aunque tenga una evaluación Aprobada', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos', () =>
        HttpResponse.json([{ ...MOCK_CASO_RESUMEN, id: '1', estado: 'Asignado' }])
      ),
      http.get('http://localhost:3000/api/v1/casos/:id', () =>
        HttpResponse.json({
          ...MOCK_CASO_DETALLE,
          id: '1',
          expediente: { id: '1', estado: 'Cerrado' },
          evaluaciones: [{ id: '10', idEstado: 5, fechaProgramada: null }],
        })
      )
    );

    const { result } = renderHook(() => useCasosCerrables(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});

describe('useCerrarExpediente', () => {
  it('llama a PATCH /expedientes/:casoId/cerrar y devuelve el expediente cerrado', async () => {
    let urlLlamada = '';
    server.use(
      http.patch('http://localhost:3000/api/v1/expedientes/:casoId/cerrar', ({ request }) => {
        urlLlamada = request.url;
        return HttpResponse.json(MOCK_EXPEDIENTE);
      })
    );

    const { result } = renderHook(() => useCerrarExpediente(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlLlamada).toContain('/expedientes/1/cerrar');
    expect(result.current.data).toEqual(MOCK_EXPEDIENTE);
  });

  it('propaga el error real cuando el caso no tiene una evaluación aprobada', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/expedientes/:casoId/cerrar', () =>
        HttpResponse.json(
          { message: 'El caso no tiene una evaluación aprobada por el Coordinador; no puede cerrarse.' },
          { status: 400 }
        )
      )
    );

    const { result } = renderHook(() => useCerrarExpediente(), { wrapper: crearWrapper() });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      'El caso no tiene una evaluación aprobada por el Coordinador; no puede cerrarse.'
    );
  });
});
