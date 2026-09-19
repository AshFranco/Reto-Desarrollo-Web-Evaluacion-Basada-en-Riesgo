import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_ADJUNTO_SOLICITUD } from '@/mocks/handlers';
import { db } from '@/lib/db';
import {
  useAdjuntosSolicitud,
  useSubirAdjunto,
  useEliminarAdjunto,
} from './useAdjuntosSolicitud';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useAdjuntosSolicitud', () => {
  it('devuelve la lista de adjuntos de una solicitud', async () => {
    const { result } = renderHook(() => useAdjuntosSolicitud('1'), {
      wrapper: crearWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.tipo).toBe('CROQUIS');
    expect(result.current.data?.[0]?.nombreArchivo).toBe('croquis_planta.pdf');
  });

  it('no dispara la query si solicitudId es null', () => {
    const { result } = renderHook(() => useAdjuntosSolicitud(null), {
      wrapper: crearWrapper(),
    });
    // Debe quedar en estado "pendiente" (no fetching sin id)
    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
  });
});

describe('useSubirAdjunto', () => {
  it('sube un adjunto con multipart y devuelve el adjunto creado', async () => {
    const { result } = renderHook(() => useSubirAdjunto(), {
      wrapper: crearWrapper(),
    });

    const archivo = new File(['contenido'], 'croquis.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      result.current.mutate({
        solicitudId: '1',
        archivo,
        tipo: 'CROQUIS',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nombreArchivo).toBe('nuevo_adjunto.pdf');
  });

  it('propaga el error cuando el backend rechaza por solicitud ya enviada (400)', async () => {
    server.use(
      http.post(
        'http://localhost:3000/api/v1/solicitudes-bpm/:id/adjuntos',
        () =>
          HttpResponse.json(
            {
              message:
                'No se pueden agregar adjuntos a una solicitud ya enviada.',
            },
            { status: 400 },
          ),
      ),
    );

    const { result } = renderHook(() => useSubirAdjunto(), {
      wrapper: crearWrapper(),
    });

    const archivo = new File(['x'], 'x.pdf', { type: 'application/pdf' });

    await act(async () => {
      result.current.mutate({ solicitudId: '1', archivo, tipo: 'OTRO' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      'No se pueden agregar adjuntos a una solicitud ya enviada.',
    );
  });
});

describe('useEliminarAdjunto', () => {
  it('elimina un adjunto y devuelve el mensaje de confirmación', async () => {
    const { result } = renderHook(() => useEliminarAdjunto(), {
      wrapper: crearWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        adjuntoId: MOCK_ADJUNTO_SOLICITUD.id,
        solicitudId: '1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.mensaje).toBe('Adjunto eliminado correctamente.');
  });

  it('propaga el error cuando el backend rechaza por solicitud ya enviada (400)', async () => {
    server.use(
      http.delete(
        'http://localhost:3000/api/v1/solicitudes-bpm/adjuntos/:adjuntoId',
        () =>
          HttpResponse.json(
            {
              message:
                'No se pueden eliminar adjuntos de una solicitud ya enviada.',
            },
            { status: 400 },
          ),
      ),
    );

    const { result } = renderHook(() => useEliminarAdjunto(), {
      wrapper: crearWrapper(),
    });

    await act(async () => {
      result.current.mutate({ adjuntoId: '99', solicitudId: '1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      'No se pueden eliminar adjuntos de una solicitud ya enviada.',
    );
  });
});
