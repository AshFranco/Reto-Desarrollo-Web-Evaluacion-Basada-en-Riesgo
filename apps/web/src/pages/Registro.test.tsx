import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Registro from './Registro';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Registro />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * MUI agrega un asterisco visual al texto del <label> de los campos
 * required ("Nombre completo *"), así que el matcher exacto de
 * getByLabelText no encuentra el campo — se usa una regex anclada al
 * inicio en vez de forzar los campos a no-requeridos solo para el test.
 *
 * El selector de empresa es un MUI Select real, deshabilitado mientras
 * useEmpresasPublicas() está cargando (confirmado en vivo con un debug
 * manual: si se hace click ANTES de que cargandoEmpresas pase a false, el
 * campo sigue disabled en ese instante y el clic no hace nada, aunque el
 * test no vea ningún error hasta que falla el siguiente `findByRole`). Por
 * eso se espera el texto de ayuda "Elegí la empresa…" antes de interactuar,
 * y se usa @testing-library/user-event (ya en package.json) en vez de
 * fireEvent.mouseDown -- MUI Select necesita la secuencia completa de
 * eventos de puntero, no solo mousedown, para abrir de forma confiable en jsdom.
 */
async function completarFormulario(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Usuario Nuevo' } });
  fireEvent.change(screen.getByLabelText(/^Cédula o pasaporte/), { target: { value: '001-1234567-8' } });
  fireEvent.change(screen.getByLabelText(/^Correo/), { target: { value: 'nuevo@ebr.local' } });
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'ClaveSegura#123' } });

  await screen.findByText('Seleccione la empresa a la que pertenece.');
  await user.click(screen.getByLabelText(/^Empresa/));
  await user.click(await screen.findByRole('option', { name: /Alimentos de Prueba SRL/ }));
}

describe('Registro', () => {
  it('al enviar el formulario completo, muestra el mensaje de pendiente de aprobación', async () => {
    const user = userEvent.setup();
    renderPantalla();
    await completarFormulario(user);

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() => expect(screen.getByText('Registro enviado')).toBeInTheDocument());
    expect(
      screen.getByText(/quedó pendiente de aprobación/)
    ).toBeInTheDocument();
  });

  it('NO inicia sesión automáticamente tras registrarse', async () => {
    const user = userEvent.setup();
    renderPantalla();
    await completarFormulario(user);

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() => expect(screen.getByText('Registro enviado')).toBeInTheDocument());
    expect(await getSession()).toBeNull();
  });

  it('muestra el error real del backend cuando el registro falla', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', () =>
        HttpResponse.json({ message: 'Ya existe un usuario con ese correo o cédula.' }, { status: 400 })
      )
    );
    renderPantalla();
    await completarFormulario(user);

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() =>
      expect(screen.getByText('Ya existe un usuario con ese correo o cédula.')).toBeInTheDocument()
    );
    expect(screen.queryByText('Registro enviado')).not.toBeInTheDocument();
  });

  it('tiene un enlace de vuelta a /login', () => {
    renderPantalla();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });

  it('carga las empresas desde GET /empresas/publicas y las ofrece como opciones', async () => {
    const user = userEvent.setup();
    renderPantalla();

    await screen.findByText('Seleccione la empresa a la que pertenece.');
    await user.click(screen.getByLabelText(/^Empresa/));
    expect(await screen.findByRole('option', { name: /Alimentos de Prueba SRL/ })).toBeInTheDocument();
  });

  it('manda cartaAutorizacionUrl solo si se completó (es opcional)', async () => {
    const user = userEvent.setup();
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(
          { mensaje: 'ok', usuario: { id: '1', correoElectronico: 'x', nombreCompleto: 'x' } },
          { status: 201 }
        );
      })
    );
    renderPantalla();
    await completarFormulario(user);

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() => expect(screen.getByText('Registro enviado')).toBeInTheDocument());
    expect(cuerpoRecibido.cartaAutorizacionUrl).toBeUndefined();
  });

  it('incluye cartaAutorizacionUrl en el envío cuando se completa el campo', async () => {
    const user = userEvent.setup();
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(
          { mensaje: 'ok', usuario: { id: '1', correoElectronico: 'x', nombreCompleto: 'x' } },
          { status: 201 }
        );
      })
    );
    renderPantalla();
    await completarFormulario(user);
    fireEvent.change(screen.getByLabelText(/^Carta de autorización/), {
      target: { value: 'https://storage.example.com/cartas/carta-001.pdf' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() => expect(screen.getByText('Registro enviado')).toBeInTheDocument());
    expect(cuerpoRecibido.cartaAutorizacionUrl).toBe('https://storage.example.com/cartas/carta-001.pdf');
  });
});
