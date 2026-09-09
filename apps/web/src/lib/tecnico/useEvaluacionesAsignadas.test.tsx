import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_ASIGNACION_MIA } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useEvaluacionesAsignadas } from './useEvaluacionesAsignadas';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useEvaluacionesAsignadas', () => {
  it('devuelve las asignaciones del técnico, con el caso y el establecimiento incluidos', async () => {
    const { result } = renderHook(() => useEvaluacionesAsignadas(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_ASIGNACION_MIA]);
    const primera = result.current.data?.[0];
    expect(primera?.caso.establecimiento.nombre).toBe('Planta Piloto de Prueba');
  });

  it('la respuesta incluye el evaluacionId real de cada asignación', async () => {
    const { result } = renderHook(() => useEvaluacionesAsignadas(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.evaluacionId).toBe(MOCK_ASIGNACION_MIA.evaluacionId);
  });

  it('devuelve una lista vacía cuando el técnico no tiene casos asignados', async () => {
    server.use(http.get('http://localhost:3000/api/v1/asignaciones/mias', () => HttpResponse.json([])));

    const { result } = renderHook(() => useEvaluacionesAsignadas(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('propaga el error si el backend responde con un error', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/asignaciones/mias', () =>
        HttpResponse.json({ message: 'Error interno' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useEvaluacionesAsignadas(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Error interno');
  });
});
