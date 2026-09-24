import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import FormularioEstablecimiento from './FormularioEstablecimiento';

beforeEach(async () => {
  await db.open();
  await saveSession({
    accessToken: 'token',
    usuario: { id: '1', nombreCompleto: 'Admin Empresa', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '1' },
  });
});
afterEach(() => db.delete());

function irAlPasoOperativo() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/empresa/establecimientos/nuevo']}>
        <Routes>
          <Route path="/empresa/establecimientos/nuevo" element={<FormularioEstablecimiento />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Planta Norte' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

describe('Mercado objetivo del establecimiento', () => {
  it('es un desplegable con las opciones de la Ficha BPM, no un texto libre', async () => {
    irAlPasoOperativo();

    const campo = await screen.findByRole('combobox', { name: 'Mercado objetivo' });
    fireEvent.mouseDown(campo);
    const lista = within(await screen.findByRole('listbox'));

    const opciones = lista.getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual([
      'Sin especificar',
      'Infantil',
      'Niños menores',
      'Adultos',
      'Mujeres embarazadas',
      'Adultos mayores',
      'Todos los segmentos',
    ]);

    fireEvent.click(lista.getByRole('option', { name: 'Adultos mayores' }));
    expect(screen.getByRole('combobox', { name: 'Mercado objetivo' })).toHaveTextContent('Adultos mayores');
  });

  it('Comercialización también es un desplegable con las opciones de la Ficha BPM', async () => {
    irAlPasoOperativo();

    const campo = await screen.findByRole('combobox', { name: 'Comercialización' });
    fireEvent.mouseDown(campo);
    const lista = within(await screen.findByRole('listbox'));

    expect(lista.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Sin especificar',
      'Local',
      'Nacional',
      'Internacional',
      'Todos los mercados',
    ]);

    fireEvent.click(lista.getByRole('option', { name: 'Internacional' }));
    expect(screen.getByRole('combobox', { name: 'Comercialización' })).toHaveTextContent('Internacional');
  });
});
