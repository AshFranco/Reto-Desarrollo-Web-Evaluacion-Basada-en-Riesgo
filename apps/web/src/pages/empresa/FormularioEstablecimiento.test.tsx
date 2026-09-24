import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function renderFormulario() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/empresa/establecimientos/nuevo']}>
        <Routes>
          <Route path="/empresa/establecimientos/nuevo" element={<FormularioEstablecimiento />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Formulario de establecimiento', () => {
  it('no pide el RNC: es único por empresa y ya se registra con la empresa', () => {
    renderFormulario();

    expect(screen.getByLabelText(/^Nombre/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/RNC/i)).not.toBeInTheDocument();
  });
});
