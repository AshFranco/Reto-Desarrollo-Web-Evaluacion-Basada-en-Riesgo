import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_CASO_RESUMEN, MOCK_CASO_DETALLE, MOCK_ASIGNACION } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useCasos, useCasoDetalle, useAsignarEvaluador, useCasosAsignados } from './useCasos';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCasos', () => {
  it('devuelve la lista de casos', async () => {
    const { result } = renderHook(() => useCasos(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_CASO_RESUMEN]);
  });
});

describe('useCasoDetalle', () => {
  it('devuelve el detalle de un caso, incluyendo la empresa', async () => {
    const { result } = renderHook(() => useCasoDetalle('1'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.establecimiento.empresa.razonSocial).toBe('Alimentos de Prueba SRL');
  });

  it('no hace la petición si el id es null', async () => {
    const { result } = renderHook(() => useCasoDetalle(null), { wrapper: crearWrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useAsignarEvaluador', () => {
  it('asigna el evaluador y devuelve la asignación creada', async () => {
    const { result } = renderHook(() => useAsignarEvaluador(), { wrapper: crearWrapper() });

    result.current.mutate({ casoId: '1', evaluadorId: '2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_ASIGNACION);
  });

  it('propaga el error cuando el usuario indicado no es un Técnico Evaluador válido', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/asignaciones', () =>
        HttpResponse.json({ message: 'El usuario indicado no es un Técnico Evaluador válido.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useAsignarEvaluador(), { wrapper: crearWrapper() });
    result.current.mutate({ casoId: '1', evaluadorId: '999' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('El usuario indicado no es un Técnico Evaluador válido.');
  });
});

describe('useCasosAsignados', () => {
  it('trae el detalle solo de los casos en estado Asignado, ignorando Pendiente/Cerrado', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos', () =>
        HttpResponse.json([
          { ...MOCK_CASO_RESUMEN, id: '1', estado: 'Asignado' },
          { ...MOCK_CASO_RESUMEN, id: '2', estado: 'Pendiente' },
          { ...MOCK_CASO_RESUMEN, id: '3', estado: 'Cerrado' },
        ])
      ),
      http.get('http://localhost:3000/api/v1/casos/:id', ({ params }) =>
        HttpResponse.json({ ...MOCK_CASO_DETALLE, id: params.id as string })
      )
    );

    const { result } = renderHook(() => useCasosAsignados(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]?.id).toBe('1');
  });
});
