import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_EVIDENCIA } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { useSubirEvidencia } from './useEvidencias';

beforeEach(() => db.open());
afterEach(() => db.delete());

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function archivoDePrueba() {
  return new File(['contenido de prueba'], 'foto.png', { type: 'image/png' });
}

/**
 * NOTA sobre estos tests: no inspeccionan los campos exactos del multipart
 * (request.formData() del lado del handler) porque en el entorno de test
 * (jsdom) el FormData/File que arma el hook y el fetch() que realmente
 * ejecuta la petición (el nativo de Node) son de clases distintas -- el
 * body llega como el string "[object FormData]" en vez de un multipart
 * real, confirmado con un test de diagnóstico aparte. Es un choque del
 * entorno de pruebas, no un bug del hook: contra el backend real (Docker)
 * la subida con evaluacionId/tipo/respuestaItemId/archivo quedó verificada
 * en vivo (ver PR). Estos tests cubren lo que sí es fiable acá: que el
 * hook llama al endpoint correcto y maneja éxito/error como corresponde.
 */
describe('useSubirEvidencia', () => {
  it('sube el archivo y devuelve la evidencia creada', async () => {
    // Se fija el handler explicitamente (en vez de depender del handler por
    // defecto) porque request.formData() del lado del handler puede o no
    // fallar al parsear el FormData de jsdom segun la version de Node/undici
    // (ver nota de archivo mas arriba) -- sin esto el test es no determinista
    // entre entornos (paso en local, fallo en CI con Node 22 en Linux).
    server.use(
      http.post('http://localhost:3000/api/v1/evidencias', () => HttpResponse.json(MOCK_EVIDENCIA))
    );

    const { result } = renderHook(() => useSubirEvidencia(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', archivo: archivoDePrueba(), tipo: 'FOTO' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_EVIDENCIA);
  });

  it('llama a POST /api/v1/evidencias', async () => {
    let metodoRecibido = '';
    let urlRecibida = '';
    server.use(
      http.post('http://localhost:3000/api/v1/evidencias', ({ request }) => {
        metodoRecibido = request.method;
        urlRecibida = request.url;
        return HttpResponse.json(MOCK_EVIDENCIA);
      })
    );

    const { result } = renderHook(() => useSubirEvidencia(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', archivo: archivoDePrueba(), tipo: 'FOTO', respuestaItemId: '226' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(metodoRecibido).toBe('POST');
    expect(urlRecibida).toContain('/api/v1/evidencias');
  });

  it('propaga el error real cuando la evaluación ya está bloqueada', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evidencias', () =>
        HttpResponse.json(
          { message: 'La evaluación está bloqueada; no se pueden añadir evidencias.' },
          { status: 403 }
        )
      )
    );

    const { result } = renderHook(() => useSubirEvidencia(), { wrapper: crearWrapper() });
    result.current.mutate({ evaluacionId: '1', archivo: archivoDePrueba(), tipo: 'FOTO' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('La evaluación está bloqueada; no se pueden añadir evidencias.');
  });

  it('sin conexión, encola la evidencia en vez de perderla', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evidencias', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useSubirEvidencia(), { wrapper: crearWrapper() });
    result.current.mutate({
      evaluacionId: '1',
      archivo: archivoDePrueba(),
      tipo: 'FOTO',
      respuestaItemId: '226',
      latitud: 18.4861,
      longitud: -69.9312,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const pendientes = await db.cola_sync.where('tipo').equals('EVIDENCIA').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toMatchObject({
      evaluacionId: '1',
      tipo: 'FOTO',
      respuestaItemId: '226',
      latitud: 18.4861,
      longitud: -69.9312,
      nombreArchivo: 'foto.png',
    });
  });
});
