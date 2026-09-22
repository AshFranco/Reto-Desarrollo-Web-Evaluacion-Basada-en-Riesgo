import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { MOCK_SOLICITUD } from '@/mocks/handlers';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import FormularioSolicitud from './FormularioSolicitud';
import DashboardEmpresa from '@/pages/dashboard/DashboardEmpresa';

beforeEach(async () => {
  await db.open();
  await saveSession({
    accessToken: 'token',
    usuario: { id: '1', nombreCompleto: 'Admin Empresa', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '1' },
  });
  // En los mocks globales GET /empresas/:id se declara antes y captura /empresas/delegados.
  server.use(http.get('http://localhost:3000/api/v1/empresas/delegados', () => HttpResponse.json([])));
});
afterEach(() => db.delete());

function renderEn(ruta: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/empresa" element={<DashboardEmpresa />} />
          <Route path="/empresa/solicitudes/nueva" element={<FormularioSolicitud />} />
          <Route path="/empresa/solicitudes/:id/continuar" element={<FormularioSolicitud />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Continuar un borrador de solicitud BPM', () => {
  it('el listado muestra el borrador como "Borrador" con un botón Continuar que abre su formulario', async () => {
    renderEn('/empresa');

    expect(await screen.findByText('Borrador')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente de Asignacion')).not.toBeInTheDocument();
    const continuar = screen.getByRole('link', { name: 'Continuar' });
    expect(continuar).toHaveAttribute('href', `/empresa/solicitudes/${MOCK_SOLICITUD.id}/continuar`);

    fireEvent.click(continuar);
    expect(await screen.findByText('Continuar solicitud BPM')).toBeInTheDocument();
  });

  it('una solicitud ya enviada se muestra como "Enviada" y no ofrece Continuar', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/solicitudes-bpm/mias', () =>
        HttpResponse.json([{ ...MOCK_SOLICITUD, estado: 'Asignada', fechaEnvio: '2026-01-02T00:00:00.000Z' }])
      )
    );
    renderEn('/empresa');

    expect(await screen.findByText('Enviada')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continuar' })).not.toBeInTheDocument();
  });

  it('reabre el borrador en el paso de establecimiento con sus datos, sin crear otra solicitud', async () => {
    let creaciones = 0;
    server.use(
      http.post('http://localhost:3000/api/v1/solicitudes-bpm', () => {
        creaciones++;
        return HttpResponse.json(MOCK_SOLICITUD);
      })
    );
    renderEn(`/empresa/solicitudes/${MOCK_SOLICITUD.id}/continuar`);

    expect(await screen.findByText('Continuar solicitud BPM')).toBeInTheDocument();
    expect(await screen.findByText(/Establecimiento \(necesario solo para enviar/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByLabelText(/^Motivo/)).toHaveValue(MOCK_SOLICITUD.motivo);
    expect(screen.getByLabelText(/^Motivo/)).toBeDisabled();
    expect(creaciones).toBe(0);
  });

  it('desde el borrador reabierto se puede enviar la solicitud existente', async () => {
    let enviado: { id?: string; cuerpo?: any } = {};
    server.use(
      http.get('http://localhost:3000/api/v1/empresas/:id', () =>
        HttpResponse.json({
          id: '1',
          razonSocial: 'Alimentos de Prueba SRL',
          rnc: '130000001',
          establecimientos: [{ id: '5', nombre: 'Planta Norte' }],
        })
      ),
      http.post('http://localhost:3000/api/v1/solicitudes-bpm/:id/enviar', async ({ request, params }) => {
        enviado = { id: String(params.id), cuerpo: await request.json() };
        return HttpResponse.json({ ...MOCK_SOLICITUD, estado: 'Asignada' });
      })
    );
    renderEn(`/empresa/solicitudes/${MOCK_SOLICITUD.id}/continuar`);

    await screen.findByText(/Establecimiento \(necesario solo para enviar/);
    fireEvent.mouseDown(await screen.findByLabelText('Establecimiento'));
    fireEvent.click(await screen.findByRole('option', { name: 'Planta Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar directamente' }));

    await waitFor(() => expect(enviado.id).toBe(MOCK_SOLICITUD.id));
    expect(enviado.cuerpo).toEqual({ establecimientoId: '5' });
    expect(await screen.findByText('Solicitud enviada correctamente.')).toBeInTheDocument();
  });

  it('al enviar el borrador NO aparece el aviso de "ya fue enviada" aunque el listado se actualice', async () => {
    let enviada = false;
    server.use(
      http.get('http://localhost:3000/api/v1/empresas/:id', () =>
        HttpResponse.json({
          id: '1',
          razonSocial: 'Alimentos de Prueba SRL',
          rnc: '130000001',
          establecimientos: [{ id: '5', nombre: 'Planta Norte' }],
        })
      ),
      http.get('http://localhost:3000/api/v1/solicitudes-bpm/mias', () =>
        HttpResponse.json([enviada ? { ...MOCK_SOLICITUD, estado: 'Asignada' } : MOCK_SOLICITUD])
      ),
      http.post('http://localhost:3000/api/v1/solicitudes-bpm/:id/enviar', () => {
        enviada = true;
        return HttpResponse.json({ ...MOCK_SOLICITUD, estado: 'Asignada' });
      })
    );
    renderEn(`/empresa/solicitudes/${MOCK_SOLICITUD.id}/continuar`);

    await screen.findByText(/Establecimiento \(necesario solo para enviar/);
    fireEvent.mouseDown(await screen.findByLabelText('Establecimiento'));
    fireEvent.click(await screen.findByRole('option', { name: 'Planta Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar directamente' }));

    expect(await screen.findByText('Solicitud enviada correctamente.')).toBeInTheDocument();
    // Deja pasar el refetch del listado que dispara el envío.
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText(/no existe o ya fue enviada/)).not.toBeInTheDocument();
    expect(screen.getByText('Solicitud enviada correctamente.')).toBeInTheDocument();
  });

  it('avisa si la solicitud ya fue enviada o no existe, sin mostrar el formulario', async () => {
    renderEn('/empresa/solicitudes/999/continuar');

    expect(await screen.findByText(/no existe o ya fue enviada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar directamente' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Motivo/)).not.toBeInTheDocument();
  });

  it('en una solicitud nueva los campos siguen editables hasta guardar el borrador', async () => {
    renderEn('/empresa/solicitudes/nueva');

    expect(await screen.findByText('Nueva solicitud BPM')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Motivo/)).toBeEnabled();
  });
});

describe('Descartar un borrador de solicitud BPM', () => {
  it('pide confirmación, llama a DELETE /solicitudes-bpm/:id y el borrador desaparece del listado', async () => {
    let descartada = false;
    let idBorrado = '';
    server.use(
      http.get('http://localhost:3000/api/v1/solicitudes-bpm/mias', () =>
        HttpResponse.json(descartada ? [] : [MOCK_SOLICITUD])
      ),
      http.delete('http://localhost:3000/api/v1/solicitudes-bpm/:id', ({ params }) => {
        descartada = true;
        idBorrado = String(params.id);
        return HttpResponse.json({ mensaje: 'Borrador descartado correctamente.' });
      })
    );
    renderEn('/empresa');

    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/no se puede deshacer/)).toBeInTheDocument();
    expect(idBorrado).toBe('');

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(idBorrado).toBe(MOCK_SOLICITUD.id));
    expect(await screen.findByText('Todavía no hay solicitudes BPM registradas.')).toBeInTheDocument();
  });

  it('"Volver" cierra el diálogo sin borrar nada', async () => {
    let llamadas = 0;
    server.use(
      http.delete('http://localhost:3000/api/v1/solicitudes-bpm/:id', () => {
        llamadas++;
        return HttpResponse.json({ mensaje: 'ok' });
      })
    );
    renderEn('/empresa');

    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Volver' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(llamadas).toBe(0);
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('muestra el error real del backend y mantiene el diálogo abierto', async () => {
    server.use(
      http.delete('http://localhost:3000/api/v1/solicitudes-bpm/:id', () =>
        HttpResponse.json({ message: 'Solo se pueden descartar solicitudes en borrador.' }, { status: 400 })
      )
    );
    renderEn('/empresa');

    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descartar' }));

    expect(await within(dialogo).findByText('Solo se pueden descartar solicitudes en borrador.')).toBeInTheDocument();
  });

  it('una solicitud enviada no ofrece Descartar', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/solicitudes-bpm/mias', () =>
        HttpResponse.json([{ ...MOCK_SOLICITUD, estado: 'Asignada' }])
      )
    );
    renderEn('/empresa');

    await screen.findByText('Enviada');
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
  });

  it('la tarjeta "Solicitudes BPM" no cuenta los borradores', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/solicitudes-bpm/mias', () =>
        HttpResponse.json([MOCK_SOLICITUD, { ...MOCK_SOLICITUD, id: '2', estado: 'Asignada' }])
      )
    );
    renderEn('/empresa');

    const tarjeta = (await screen.findByText('Solicitudes BPM', { selector: '*:not(h6)' })).closest('div');
    await waitFor(() => expect(tarjeta?.parentElement?.textContent).toMatch(/^1/));
  });
});
