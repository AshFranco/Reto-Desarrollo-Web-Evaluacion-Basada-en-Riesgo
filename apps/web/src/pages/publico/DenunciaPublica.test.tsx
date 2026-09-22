import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import DenunciaPublica from './DenunciaPublica';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DenunciaPublica />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DenunciaPublica', () => {
  it('NO tiene la barra de navegación (sin sesión, sin AppLayout)', () => {
    renderPantalla();
    expect(screen.getByAltText(/SINEC/)).toBeInTheDocument();
    // AppLayout siempre incluye "Cerrar sesión" en el menú de usuario -- si apareciera acá sería una fuga del layout autenticado.
    expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument();
  });

  it('el campo Tu nombre está visible por defecto (denuncia no anónima)', () => {
    renderPantalla();
    expect(screen.getByLabelText(/^Tu nombre/)).toBeInTheDocument();
  });

  it('al marcar "denuncia anónima", oculta el campo del nombre', () => {
    renderPantalla();

    fireEvent.click(screen.getByLabelText(/Denuncia anónima/));

    expect(screen.queryByLabelText(/^Tu nombre/)).not.toBeInTheDocument();
  });

  it('registra una denuncia anónima y muestra el número de referencia', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ id: '42' }, { status: 201 });
      })
    );
    renderPantalla();

    fireEvent.click(screen.getByLabelText(/Denuncia anónima/));
    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denuncia' }));

    await waitFor(() => expect(screen.getByText('Denuncia registrada')).toBeInTheDocument());
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(cuerpoRecibido).toEqual({ fechaRecepcion: '2026-04-01' });
  });

  it('registra una denuncia no anónima con el nombre completado', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ id: '43' }, { status: 201 });
      })
    );
    renderPantalla();

    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText(/^Tu nombre/), { target: { value: 'Ana Vecina' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denuncia' }));

    await waitFor(() => expect(screen.getByText('Denuncia registrada')).toBeInTheDocument());
    expect(cuerpoRecibido).toEqual({ fechaRecepcion: '2026-04-01', denunciante: 'Ana Vecina' });
  });

  it('muestra el error real del backend cuando falla el envío', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', () =>
        HttpResponse.json({ message: 'fechaRecepcion debe ser una fecha válida.' }, { status: 400 })
      )
    );
    renderPantalla();

    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denuncia' }));

    await waitFor(() =>
      expect(screen.getByText('fechaRecepcion debe ser una fecha válida.')).toBeInTheDocument()
    );
    expect(screen.queryByText('Denuncia registrada')).not.toBeInTheDocument();
  });

  it('carga las empresas desde GET /empresas/publicas y las ofrece como opciones', async () => {
    const user = userEvent.setup();
    renderPantalla();

    await screen.findByText('Opcional, si la conoce.');
    await user.click(screen.getByLabelText(/^Empresa denunciada/));
    expect(await screen.findByRole('option', { name: /Alimentos de Prueba SRL/ })).toBeInTheDocument();
  });

  it('NO manda ningún header Authorization al backend, aunque haya una sesión guardada en el navegador', async () => {
    await saveSession({
      accessToken: 'token-de-otra-sesion',
      usuario: { id: '1', nombreCompleto: 'Coordinador de prueba', rol: 'COORDINADOR', empresaId: null },
    });

    let headerAuthRecibido: string | null = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', ({ request }) => {
        headerAuthRecibido = request.headers.get('Authorization');
        return HttpResponse.json({ id: '44' }, { status: 201 });
      })
    );
    renderPantalla();

    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denuncia' }));

    await waitFor(() => expect(screen.getByText('Denuncia registrada')).toBeInTheDocument());
    expect(headerAuthRecibido).toBeNull();
  });

  it('tiene un enlace de vuelta a /login', () => {
    renderPantalla();
    expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toHaveAttribute('href', '/login');
  });
});
