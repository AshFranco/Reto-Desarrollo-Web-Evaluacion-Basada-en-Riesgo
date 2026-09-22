import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { MOCK_EMPRESA } from '@/mocks/handlers';
import DashboardAdmin from './DashboardAdmin';
import { GestionEmpresasAdmin } from './GestionEmpresasAdmin';

function renderGestion() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GestionEmpresasAdmin />
    </QueryClientProvider>
  );
}

describe('GestionEmpresasAdmin (CU-04 — Administrador)', () => {
  it('el Panel de Admin expone la pestaña "Gestión de empresas"', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardAdmin />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('tab', { name: /gestión de empresas/i }));

    expect(await screen.findByText(MOCK_EMPRESA.razonSocial)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva empresa/i })).toBeInTheDocument();
  });

  it('lista las empresas del catálogo', async () => {
    renderGestion();
    expect(await screen.findByText(MOCK_EMPRESA.razonSocial)).toBeInTheDocument();
    expect(screen.getByText(MOCK_EMPRESA.rnc)).toBeInTheDocument();
  });

  it('muestra estado vacío si no hay empresas', async () => {
    server.use(http.get('http://localhost:3000/api/v1/empresas', () => HttpResponse.json([])));
    renderGestion();
    expect(await screen.findByText('Todavía no hay empresas registradas.')).toBeInTheDocument();
  });

  it('crea una empresa nueva enviando POST /empresas con los datos del formulario', async () => {
    let cuerpo: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/empresas', async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...MOCK_EMPRESA, id: '2', razonSocial: 'Nueva SRL', rnc: '131000555' });
      })
    );
    renderGestion();
    await screen.findByText(MOCK_EMPRESA.razonSocial);

    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    fireEvent.change(await screen.findByLabelText(/razón social/i), { target: { value: 'Nueva SRL' } });
    fireEvent.change(screen.getByLabelText(/^rnc/i), { target: { value: '131000555' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar empresa/i }));

    await waitFor(() => expect(cuerpo).not.toBeNull());
    expect(cuerpo).toMatchObject({ razonSocial: 'Nueva SRL', rnc: '131000555' });
    // Regresión: el backend rechaza "" en campos opcionales con validador (correo: "" -> 400),
    // así que los campos que quedaron vacíos no deben viajar en el body.
    expect(cuerpo).not.toHaveProperty('correo');
    expect(cuerpo).not.toHaveProperty('telefono');
    expect(cuerpo).not.toHaveProperty('direccion');
  });

  it('valida el RNC y no permite guardar con formato inválido', async () => {
    renderGestion();
    await screen.findByText(MOCK_EMPRESA.razonSocial);

    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    fireEvent.change(await screen.findByLabelText(/razón social/i), { target: { value: 'X SRL' } });
    fireEvent.change(screen.getByLabelText(/^rnc/i), { target: { value: '123' } });

    expect(await screen.findByText('El RNC debe ser numérico y de 9 o de 11 dígitos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar empresa/i })).toBeDisabled();
  });

  it('muestra el error del backend (ej. RNC duplicado) sin cerrar el diálogo', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/empresas', () =>
        HttpResponse.json({ message: 'Ya existe una empresa con ese RNC.' }, { status: 400 })
      )
    );
    renderGestion();
    await screen.findByText(MOCK_EMPRESA.razonSocial);

    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    fireEvent.change(await screen.findByLabelText(/razón social/i), { target: { value: 'Dup SRL' } });
    fireEvent.change(screen.getByLabelText(/^rnc/i), { target: { value: MOCK_EMPRESA.rnc } });
    fireEvent.click(screen.getByRole('button', { name: /registrar empresa/i }));

    expect(await screen.findByText('Ya existe una empresa con ese RNC.')).toBeInTheDocument();
    expect(screen.getByText('Registrar nueva empresa')).toBeInTheDocument();
  });

  it('edita una empresa existente enviando PATCH /empresas/:id', async () => {
    let url = '';
    let cuerpo: any = null;
    server.use(
      http.patch('http://localhost:3000/api/v1/empresas/:id', async ({ request }) => {
        url = request.url;
        cuerpo = await request.json();
        return HttpResponse.json({ ...MOCK_EMPRESA, razonSocial: 'Renombrada SA' });
      })
    );
    renderGestion();
    await screen.findByText(MOCK_EMPRESA.razonSocial);

    fireEvent.click(screen.getByRole('button', { name: `Editar ${MOCK_EMPRESA.razonSocial}` }));
    const campo = await screen.findByLabelText(/razón social/i);
    expect(campo).toHaveValue(MOCK_EMPRESA.razonSocial);
    fireEvent.change(campo, { target: { value: 'Renombrada SA' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(cuerpo).not.toBeNull());
    expect(url).toContain(`/empresas/${MOCK_EMPRESA.id}`);
    expect(cuerpo).toMatchObject({ razonSocial: 'Renombrada SA' });
  });
});
