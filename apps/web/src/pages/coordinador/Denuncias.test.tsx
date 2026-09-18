import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { MOCK_DENUNCIA } from '@/mocks/handlers';
import Denuncias from './Denuncias';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Denuncias />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Denuncias', () => {
  it('muestra la tabla de denuncias registradas', async () => {
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Condiciones sanitarias')).toBeInTheDocument());
    expect(screen.getByText('Vecino del sector')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra "sin denuncias" cuando la lista viene vacía', async () => {
    server.use(http.get('http://localhost:3000/api/v1/denuncias', () => HttpResponse.json([])));
    renderPantalla();

    await waitFor(() => expect(screen.getByText('No hay denuncias registradas.')).toBeInTheDocument());
  });

  it('el campo Denunciante está visible por defecto (denuncia no anónima)', () => {
    renderPantalla();
    expect(screen.getByLabelText(/^Denunciante/)).toBeInTheDocument();
  });

  it('al marcar "denuncia anónima", oculta el campo Denunciante', () => {
    renderPantalla();

    fireEvent.click(screen.getByLabelText(/Denuncia anónima/));

    expect(screen.queryByLabelText(/^Denunciante/)).not.toBeInTheDocument();
  });

  it('al registrar una denuncia anónima, NO manda el campo denunciante', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_DENUNCIA, { status: 201 });
      })
    );
    renderPantalla();

    fireEvent.click(screen.getByLabelText(/Denuncia anónima/));
    fireEvent.change(screen.getByLabelText(/^Fecha de recepción/), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar denuncia' }));

    await waitFor(() => expect(screen.getByText('Denuncia registrada.')).toBeInTheDocument());
    expect(cuerpoRecibido).toEqual({ fechaRecepcion: '2026-04-01' });
  });

  it('al registrar una denuncia no anónima, manda el denunciante completado', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_DENUNCIA, { status: 201 });
      })
    );
    renderPantalla();

    fireEvent.change(screen.getByLabelText(/^Fecha de recepción/), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText(/^Denunciante/), { target: { value: 'Ana Reportante' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar denuncia' }));

    await waitFor(() => expect(screen.getByText('Denuncia registrada.')).toBeInTheDocument());
    expect(cuerpoRecibido).toEqual({ fechaRecepcion: '2026-04-01', denunciante: 'Ana Reportante' });
  });

  it('exige la fecha de recepción antes de enviar', async () => {
    renderPantalla();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar denuncia' }));

    expect(await screen.findByText('La fecha de recepción es obligatoria.')).toBeInTheDocument();
  });

  it('el diálogo de resolver ofrece las 3 decisiones: Procede, No procede, Remisión', async () => {
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Condiciones sanitarias')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));

    expect(screen.getByRole('button', { name: 'Procede' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No procede' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remisión' })).toBeInTheDocument();
  });

  it('resuelve una denuncia como Remisión', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/denuncias/:id/resolver', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ ...MOCK_DENUNCIA, resultado: 'REMISION' });
      })
    );
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Condiciones sanitarias')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remisión' }));

    await waitFor(() => expect(screen.queryByText('Resolver denuncia')).not.toBeInTheDocument());
    expect(cuerpoRecibido).toEqual({ resultado: 'REMISION' });
  });
});
