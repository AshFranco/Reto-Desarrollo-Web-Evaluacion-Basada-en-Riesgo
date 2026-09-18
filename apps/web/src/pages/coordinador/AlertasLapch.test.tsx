import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { MOCK_ALERTA_LAPCH } from '@/mocks/handlers';
import AlertasLapch from './AlertasLapch';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AlertasLapch />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AlertasLapch', () => {
  it('muestra la tabla de alertas registradas', async () => {
    renderPantalla();

    await waitFor(() => expect(screen.getByText('LAPCH-2026-001')).toBeInTheDocument());
    expect(screen.getByText('Leche en polvo')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra "sin alertas" cuando la lista viene vacía', async () => {
    server.use(http.get('http://localhost:3000/api/v1/alertas-lapch', () => HttpResponse.json([])));
    renderPantalla();

    await waitFor(() => expect(screen.getByText('No hay alertas LAPCH registradas.')).toBeInTheDocument());
  });

  it('registra una alerta nueva con los datos del formulario', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/alertas-lapch', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_ALERTA_LAPCH, { status: 201 });
      })
    );
    renderPantalla();

    fireEvent.change(screen.getByLabelText(/^Número de alerta/), { target: { value: 'LAPCH-2026-099' } });
    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alerta' }));

    await waitFor(() => expect(screen.getByText('Alerta registrada.')).toBeInTheDocument());
    expect(cuerpoRecibido).toEqual({ numeroAlerta: 'LAPCH-2026-099', fecha: '2026-04-01' });
  });

  it('exige número de alerta y fecha antes de enviar', async () => {
    renderPantalla();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar alerta' }));

    expect(await screen.findByText('El número de alerta y la fecha son obligatorios.')).toBeInTheDocument();
  });

  it('al resolver, muestra advertencia si la alerta no tiene establecimiento', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/alertas-lapch', () =>
        HttpResponse.json([{ ...MOCK_ALERTA_LAPCH, idEstablecimiento: null }])
      )
    );
    renderPantalla();

    await waitFor(() => expect(screen.getByText('LAPCH-2026-001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));

    expect(screen.getByText(/no tiene un establecimiento asociado/)).toBeInTheDocument();
  });

  it('resuelve una alerta como Procede', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/alertas-lapch/:id/resolver', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ ...MOCK_ALERTA_LAPCH, resultado: 'PROCEDE' });
      })
    );
    renderPantalla();

    await waitFor(() => expect(screen.getByText('LAPCH-2026-001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Procede' }));

    await waitFor(() => expect(screen.queryByText('Resolver alerta LAPCH-2026-001')).not.toBeInTheDocument());
    expect(cuerpoRecibido).toEqual({ resultado: 'PROCEDE' });
  });

  it('el botón de resolver queda deshabilitado si ya tiene resultado', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/alertas-lapch', () =>
        HttpResponse.json([{ ...MOCK_ALERTA_LAPCH, resultado: 'NO_PROCEDE' }])
      )
    );
    renderPantalla();

    await waitFor(() => expect(screen.getByText('No procede')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Resuelta' })).toBeDisabled();
  });
});
