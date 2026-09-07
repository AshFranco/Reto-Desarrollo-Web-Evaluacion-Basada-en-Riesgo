import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_SOLICITUD } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useSolicitudesPropias, useCrearSolicitud, useEnviarSolicitud } from './useSolicitudes';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSolicitudesPropias', () => {
  it('devuelve las solicitudes BPM del usuario', async () => {
    const { result } = renderHook(() => useSolicitudesPropias(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_SOLICITUD]);
  });
});

describe('useCrearSolicitud', () => {
  it('crea la solicitud como borrador', async () => {
    const { result } = renderHook(() => useCrearSolicitud(), { wrapper: crearWrapper() });

    result.current.mutate({ tipoEstablecimiento: 'Planta procesadora', motivo: 'Inspección inicial' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.estado).toBe('Pendiente de Asignacion');
  });
});

describe('useEnviarSolicitud', () => {
  it('envía la solicitud con el establecimientoId y refleja el nuevo estado', async () => {
    const { result } = renderHook(() => useEnviarSolicitud(), { wrapper: crearWrapper() });

    result.current.mutate({ id: '1', establecimientoId: '5' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.estado).toBe('Asignada');
  });

  it('propaga el error cuando el establecimiento no pertenece a la empresa (400 del backend)', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/solicitudes-bpm/:id/enviar', () =>
        HttpResponse.json({ message: 'El establecimiento indicado no pertenece a su empresa.' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useEnviarSolicitud(), { wrapper: crearWrapper() });
    result.current.mutate({ id: '1', establecimientoId: '999' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('El establecimiento indicado no pertenece a su empresa.');
  });
});
