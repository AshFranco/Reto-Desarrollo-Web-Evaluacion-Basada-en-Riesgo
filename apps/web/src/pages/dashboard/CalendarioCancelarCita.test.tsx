import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { MOCK_EVENTO_CALENDARIO } from '@/mocks/handlers';
import DashboardCoordinador from './DashboardCoordinador';

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardCoordinador />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function calendarioConEstado(idEstado: number) {
  return [{ evaluadorId: '2', nombreCompleto: 'Juan Técnico', evaluaciones: [{ ...MOCK_EVENTO_CALENDARIO, idEstado }] }];
}

describe('Calendario del coordinador — cancelar cita', () => {
  it('ofrece "Cancelar cita" en una cita Programada y la cancela con el motivo indicado', async () => {
    let cuerpo: any = null;
    let idCancelado = '';
    server.use(
      http.patch('http://localhost:3000/api/v1/calendario/:id/cancelar', async ({ request, params }) => {
        cuerpo = await request.json();
        idCancelado = String(params.id);
        return HttpResponse.json({ mensaje: 'Cita de evaluación cancelada exitosamente.' });
      })
    );
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/Planta Piloto de Prueba/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText(/Motivo/), { target: { value: 'Cliente no disponible' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar cita' }));

    await waitFor(() => expect(cuerpo).toEqual({ motivo: 'Cliente no disponible' }));
    expect(idCancelado).toBe(MOCK_EVENTO_CALENDARIO.id);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('"Volver" cierra el diálogo sin llamar al backend', async () => {
    let llamadas = 0;
    server.use(
      http.patch('http://localhost:3000/api/v1/calendario/:id/cancelar', () => {
        llamadas++;
        return HttpResponse.json({ mensaje: 'ok' });
      })
    );
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Volver' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(llamadas).toBe(0);
  });

  it('muestra el error real del backend y mantiene abierto el diálogo', async () => {
    server.use(
      http.patch('http://localhost:3000/api/v1/calendario/:id/cancelar', () =>
        HttpResponse.json({ message: 'Solo se puede cancelar una cita que esté en estado Programada.' }, { status: 400 })
      )
    );
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar cita' }));

    expect(await within(dialogo).findByText('Solo se puede cancelar una cita que esté en estado Programada.')).toBeInTheDocument();
  });

  it('una cita ya Cancelada muestra la etiqueta "Cancelada" y no ofrece acciones', async () => {
    server.use(http.get('http://localhost:3000/api/v1/calendario', () => HttpResponse.json(calendarioConEstado(8))));
    renderPanel();

    expect(await screen.findByText('Cancelada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('una cita En curso se puede reprogramar pero no cancelar', async () => {
    server.use(http.get('http://localhost:3000/api/v1/calendario', () => HttpResponse.json(calendarioConEstado(2))));
    renderPanel();

    expect(await screen.findByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument();
  });
});
