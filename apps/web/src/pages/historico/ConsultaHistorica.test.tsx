import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import { MOCK_CASO_HISTORICO } from '@/mocks/handlers';
import ConsultaHistorica from './ConsultaHistorica';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConsultaHistorica />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function iniciarSesionComo(rol: string) {
  await saveSession({
    accessToken: 'token-test',
    usuario: { id: '1', nombreCompleto: 'Usuario de Prueba', rol, empresaId: rol === 'ADMINISTRADOR_EMPRESA' ? '1' : null },
  });
}

describe('ConsultaHistorica', () => {
  it('muestra la tabla de resultados con los datos del caso', async () => {
    await iniciarSesionComo('COORDINADOR');
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Alimentos de Prueba SRL')).toBeInTheDocument());
    expect(screen.getByText('Planta Piloto de Prueba')).toBeInTheDocument();
    expect(screen.getByText('Solicitud de Empresa')).toBeInTheDocument();
  });

  it('muestra las columnas de identificación en la tabla de resultados', async () => {
    await iniciarSesionComo('COORDINADOR');
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Caso #')).toBeInTheDocument());
    expect(screen.getByText('Solicitud')).toBeInTheDocument();
    expect(screen.getByText('Evaluación')).toBeInTheDocument();
  });

  it('muestra el selector de empresa para roles internos', async () => {
    await iniciarSesionComo('COORDINADOR');
    renderPantalla();

    await waitFor(() => expect(screen.getByLabelText('Empresa')).toBeInTheDocument());
  });

  it('no muestra el selector de empresa para el rol Empresa', async () => {
    await iniciarSesionComo('ADMINISTRADOR_EMPRESA');
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Alimentos de Prueba SRL')).toBeInTheDocument());
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
  });

  it('muestra "sin resultados" cuando los filtros no traen casos', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/casos/historico', () => HttpResponse.json([]))
    );
    await iniciarSesionComo('COORDINADOR');
    renderPantalla();

    await waitFor(() =>
      expect(screen.getByText('No se encontraron casos con esos filtros.')).toBeInTheDocument()
    );
  });

  it('al buscar, envía los filtros aplicados al servidor', async () => {
    let urlCapturada = '';
    server.use(
      http.get('http://localhost:3000/api/v1/casos/historico', ({ request }) => {
        urlCapturada = request.url;
        return HttpResponse.json([MOCK_CASO_HISTORICO]);
      })
    );
    await iniciarSesionComo('COORDINADOR');
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Alimentos de Prueba SRL')).toBeInTheDocument());

    // El label cambió a "Identificación de solicitud" — actualizado para coincidir.
    fireEvent.change(screen.getByLabelText('Identificación de solicitud'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(new URL(urlCapturada).searchParams.get('solicitudId')).toBe('5'));
  });

  it('abre el modal de inspección en modo estrictamente solo lectura', async () => {
    await iniciarSesionComo('COORDINADOR');
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Alimentos de Prueba SRL')).toBeInTheDocument());

    const botonInspeccionar = screen.getByRole('button', { name: /inspeccionar/i });
    fireEvent.click(botonInspeccionar);

    await waitFor(() => expect(screen.getByText(/Inspección Detallada del Caso/i)).toBeInTheDocument());
    expect(screen.getByText('Modo solo lectura')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cambiar técnico/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /desvincular/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reabrir caso/i })).not.toBeInTheDocument();
  });
});
