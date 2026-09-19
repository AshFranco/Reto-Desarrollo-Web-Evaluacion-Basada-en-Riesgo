import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { useRegistrosPendientes, useResolverRegistro, type UsuarioPendiente } from './useRegistrosPendientes';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const REGISTRO_PENDIENTE: UsuarioPendiente = {
  id: '10',
  nombreCompleto: 'Juan Pérez',
  correoElectronico: 'juan@empresa.com',
  cedulaPasaporte: '001-1234567-8',
  telefono: '+18095551234',
  cartaAutorizacionUrl: 'https://storage.example.com/cartas/carta-juan.pdf',
  fechaCreacion: '2026-03-01T10:00:00.000Z',
  roles: ['ADMINISTRADOR_EMPRESA'],
};

describe('useRegistrosPendientes', () => {
  it('devuelve la lista de registros pendientes, con cédula, teléfono y carta de autorización (RF-02)', async () => {
    const { result } = renderHook(() => useRegistrosPendientes(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([REGISTRO_PENDIENTE]);
  });

  it('llama a GET /api/v1/usuarios/registros/pendientes', async () => {
    let urlRecibida = '';
    server.use(
      http.get('http://localhost:3000/api/v1/usuarios/registros/pendientes', ({ request }) => {
        urlRecibida = request.url;
        return HttpResponse.json([REGISTRO_PENDIENTE]);
      })
    );

    const { result } = renderHook(() => useRegistrosPendientes(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlRecibida).toContain('/usuarios/registros/pendientes');
  });

  it('propaga el error cuando el rol no tiene permiso', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/usuarios/registros/pendientes', () =>
        HttpResponse.json({ message: 'No tiene permisos para esta operación.' }, { status: 403 })
      )
    );

    const { result } = renderHook(() => useRegistrosPendientes(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('No tiene permisos para esta operación.');
  });
});

describe('useResolverRegistro', () => {
  it('manda decision APROBADO cuando se aprueba', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/usuarios/registros/:id/resolver', async ({ request, params }) => {
        cuerpoRecibido = await request.json();
        expect(params.id).toBe('10');
        return HttpResponse.json({ ...REGISTRO_PENDIENTE, estado: 'APROBADO' });
      })
    );

    const { result } = renderHook(() => useResolverRegistro(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '10', decision: 'APROBADO' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ decision: 'APROBADO', motivoRechazo: undefined });
  });

  it('manda decision RECHAZADO con motivoRechazo', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/usuarios/registros/:id/resolver', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ ...REGISTRO_PENDIENTE, estado: 'RECHAZADO' });
      })
    );

    const { result } = renderHook(() => useResolverRegistro(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '10', decision: 'RECHAZADO', motivoRechazo: 'Documentación incompleta' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cuerpoRecibido).toEqual({ decision: 'RECHAZADO', motivoRechazo: 'Documentación incompleta' });
  });

  it('propaga el error cuando falta el motivo de rechazo', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/usuarios/registros/:id/resolver', () =>
        HttpResponse.json({ message: 'Debe indicar el motivo del rechazo.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useResolverRegistro(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '10', decision: 'RECHAZADO' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Debe indicar el motivo del rechazo.');
  });
});
