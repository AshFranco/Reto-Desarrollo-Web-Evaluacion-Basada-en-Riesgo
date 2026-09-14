import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_CASO_RESUMEN, MOCK_CASO_DETALLE } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useInformesPendientes, useRevisarInforme } from './useInformesPendientes';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useInformesPendientes', () => {
  it('deriva las evaluaciones en revisión (idEstado 4) a partir del detalle de los casos Asignado', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos', () =>
        HttpResponse.json([{ ...MOCK_CASO_RESUMEN, id: '1', estado: 'Asignado' }])
      ),
      http.get('http://localhost:3000/api/v1/casos/:id', () =>
        HttpResponse.json({
          ...MOCK_CASO_DETALLE,
          id: '1',
          evaluaciones: [
            { id: '10', idEstado: 4, fechaProgramada: null },
            { id: '11', idEstado: 2, fechaProgramada: null },
          ],
        })
      )
    );

    const { result } = renderHook(() => useInformesPendientes(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([
      {
        casoId: '1',
        evaluacionId: '10',
        establecimiento: MOCK_CASO_DETALLE.establecimiento.nombre,
        empresa: MOCK_CASO_DETALLE.establecimiento.empresa.razonSocial,
      },
    ]);
  });

  it('no incluye nada si ningún caso tiene una evaluación en revisión', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos', () =>
        HttpResponse.json([{ ...MOCK_CASO_RESUMEN, id: '1', estado: 'Asignado' }])
      ),
      http.get('http://localhost:3000/api/v1/casos/:id', () =>
        HttpResponse.json({
          ...MOCK_CASO_DETALLE,
          id: '1',
          evaluaciones: [{ id: '10', idEstado: 2, fechaProgramada: null }],
        })
      )
    );

    const { result } = renderHook(() => useInformesPendientes(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});

describe('useRevisarInforme', () => {
  it('envía la acción y las observaciones a PATCH /informes/:evaluacionId/revisar', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/informes/:evaluacionId/revisar', async ({ request, params }) => {
        cuerpoRecibido = await request.json();
        expect(params.evaluacionId).toBe('10');
        return HttpResponse.json({ id: '10', idEstado: 5 });
      })
    );

    const { result } = renderHook(() => useRevisarInforme(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '10', accion: 'APROBAR', observaciones: 'Todo en orden' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ accion: 'APROBAR', observaciones: 'Todo en orden' });
  });

  it('propaga el error real cuando la evaluación no está en revisión', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/informes/:evaluacionId/revisar', () =>
        HttpResponse.json({ message: 'La evaluación no está en revisión.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useRevisarInforme(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '10', accion: 'DEVOLVER' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('La evaluación no está en revisión.');
  });
});
