import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_CATALOGO_MOTOR_RIESGO, MOCK_RESULTADO_RIESGO } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useCatalogoMotorRiesgo, useCalcularRiesgo } from './useCalcularRiesgo';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCatalogoMotorRiesgo', () => {
  it('devuelve los factores de riesgo con sus opciones', async () => {
    const { result } = renderHook(() => useCatalogoMotorRiesgo(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_CATALOGO_MOTOR_RIESGO);
  });

  it('peso/puntaje llegan como number, no string (el servidor los convierte)', async () => {
    const { result } = renderHook(() => useCatalogoMotorRiesgo(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(typeof result.current.data?.factores[0]?.peso).toBe('number');
  });
});

describe('useCalcularRiesgo', () => {
  it('manda evaluacionId y las selecciones de factores', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/motor-riesgo/calcular', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_RESULTADO_RIESGO);
      })
    );

    const { result } = renderHook(() => useCalcularRiesgo(), { wrapper: crearWrapper() });
    result.current.mutate({
      evaluacionId: '1',
      seleccionesFactores: [{ factorId: '1', opcionId: '2' }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({
      evaluacionId: '1',
      seleccionesFactores: [{ factorId: '1', opcionId: '2' }],
    });
    expect(result.current.data).toEqual(MOCK_RESULTADO_RIESGO);
  });

  it('propaga el error real cuando falta la selección de un factor', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/motor-riesgo/calcular', () =>
        HttpResponse.json({ message: 'Falta la selección para el factor "Volumen de producción".' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useCalcularRiesgo(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', seleccionesFactores: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Falta la selección para el factor "Volumen de producción".');
  });
});
