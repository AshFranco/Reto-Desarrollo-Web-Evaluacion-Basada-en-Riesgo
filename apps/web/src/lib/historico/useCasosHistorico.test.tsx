import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/node';
import { MOCK_CASO_HISTORICO } from '@/mocks/handlers';
import { useCasosHistorico } from './useCasosHistorico';

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCasosHistorico', () => {
  it('devuelve la lista de casos sin filtros', async () => {
    const { result } = renderHook(() => useCasosHistorico({}), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_CASO_HISTORICO]);
  });

  it('arma la query string solo con los filtros presentes', async () => {
    let urlCapturada = '';
    server.use(
      http.get('http://localhost:3000/api/v1/casos/historico', ({ request }) => {
        urlCapturada = request.url;
        return HttpResponse.json([MOCK_CASO_HISTORICO]);
      })
    );

    const { result } = renderHook(
      () => useCasosHistorico({ empresaId: '1', estado: 'Cerrado' }),
      { wrapper: crearWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const params = new URL(urlCapturada).searchParams;
    expect(params.get('empresaId')).toBe('1');
    expect(params.get('estado')).toBe('Cerrado');
    expect(params.get('solicitudId')).toBeNull();
    expect(params.get('fechaCreacionDesde')).toBeNull();
  });

  it('propaga la respuesta vacía cuando ningún caso coincide con los filtros', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos/historico', () => HttpResponse.json([]))
    );

    const { result } = renderHook(() => useCasosHistorico({ estado: 'Pendiente' }), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
