import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { db } from '@/lib/db';
import { MOCK_CATALOGO } from '@/mocks/handlers';
import { useFichaVigente } from './useFichaVigente';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFichaVigente', () => {
  it('devuelve la ficha vigente con sus secciones y opciones de respuesta', async () => {
    const { result } = renderHook(() => useFichaVigente(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_CATALOGO);
  });

  it('las opciones de respuesta no tienen campo nombre (no existe en el backend real)', async () => {
    const { result } = renderHook(() => useFichaVigente(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const opcion = result.current.data?.opcionesRespuesta[0] as unknown as Record<string, unknown>;
    expect(opcion.nombre).toBeUndefined();
    expect(typeof opcion.valor).toBe('string');
  });
});
