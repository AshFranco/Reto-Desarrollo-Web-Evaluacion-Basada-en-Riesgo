import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_ESTABLECIMIENTO } from '@/mocks/handlers';
import { db } from '@/lib/db';
import {
  useEstablecimientos,
  useEstablecimiento,
  useCrearEstablecimiento,
  useEditarEstablecimiento,
} from './useEstablecimientos';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useEstablecimientos', () => {
  it('devuelve la lista de establecimientos de la empresa', async () => {
    const { result } = renderHook(() => useEstablecimientos(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_ESTABLECIMIENTO]);
  });
});

describe('useEstablecimiento', () => {
  it('devuelve un establecimiento por id, incluyendo la empresa', async () => {
    const { result } = renderHook(() => useEstablecimiento('1'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nombre).toBe('Planta de Prueba');
    expect(result.current.data?.empresa?.razonSocial).toBe('Alimentos de Prueba SRL');
  });

  it('no hace la petición si el id es null', async () => {
    const { result } = renderHook(() => useEstablecimiento(null), { wrapper: crearWrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCrearEstablecimiento', () => {
  it('crea el establecimiento y devuelve los datos del backend', async () => {
    const { result } = renderHook(() => useCrearEstablecimiento(), { wrapper: crearWrapper() });

    result.current.mutate({ nombre: 'Planta Nueva' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_ESTABLECIMIENTO);
  });

  it('propaga el error tal cual cuando el backend lo rechaza (ej. sin empresa vinculada)', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/establecimientos', () =>
        HttpResponse.json({ message: 'Su usuario no está vinculado a ninguna empresa todavía.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useCrearEstablecimiento(), { wrapper: crearWrapper() });
    result.current.mutate({ nombre: 'Planta Nueva' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Su usuario no está vinculado a ninguna empresa todavía.');
  });
});

describe('useEditarEstablecimiento', () => {
  it('edita el establecimiento y devuelve los datos actualizados', async () => {
    const { result } = renderHook(() => useEditarEstablecimiento('1'), { wrapper: crearWrapper() });

    result.current.mutate({ nombre: 'Planta de Prueba (editada)' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_ESTABLECIMIENTO);
  });
});
