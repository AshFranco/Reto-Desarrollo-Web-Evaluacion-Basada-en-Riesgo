import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_EMPRESA } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useEmpresas, useEmpresa, useCrearEmpresa, useEditarEmpresa } from './useEmpresas';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useEmpresas', () => {
  it('devuelve la lista de empresas del usuario', async () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_EMPRESA]);
  });
});

describe('useEmpresa', () => {
  it('devuelve una empresa por id, incluyendo establecimientos', async () => {
    const { result } = renderHook(() => useEmpresa('1'), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.razonSocial).toBe('Alimentos de Prueba SRL');
    expect(result.current.data?.establecimientos).toEqual([]);
  });

  it('no hace la petición si el id es null (enabled: false)', async () => {
    const { result } = renderHook(() => useEmpresa(null), { wrapper: crearWrapper() });

    // Nunca debería pasar a loading/success porque la query está deshabilitada.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});

describe('useCrearEmpresa', () => {
  it('crea la empresa y devuelve los datos del backend', async () => {
    const { result } = renderHook(() => useCrearEmpresa(), { wrapper: crearWrapper() });

    result.current.mutate({ razonSocial: 'Nueva Empresa SRL', rnc: '130000002' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_EMPRESA);
  });

  it('propaga el error tal cual cuando el backend rechaza (ej. 403 por rol)', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/empresas', () =>
        HttpResponse.json({ message: 'No tiene permisos para esta operación.' }, { status: 403 })
      )
    );

    const { result } = renderHook(() => useCrearEmpresa(), { wrapper: crearWrapper() });
    result.current.mutate({ razonSocial: 'X', rnc: '1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('No tiene permisos para esta operación.');
  });
});

describe('useEditarEmpresa', () => {
  it('edita la empresa y devuelve los datos actualizados', async () => {
    const { result } = renderHook(() => useEditarEmpresa('1'), { wrapper: crearWrapper() });

    result.current.mutate({ razonSocial: 'Alimentos de Prueba SRL', rnc: '130000001', telefono: '809-000-0000' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_EMPRESA);
  });
});
