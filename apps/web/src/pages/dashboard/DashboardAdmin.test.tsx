import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardAdmin from './DashboardAdmin';

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardAdmin />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardAdmin', () => {
  it('muestra las métricas de administración y los usuarios pendientes', async () => {
    renderPantalla();

    // Verifica que cargue el encabezado y las tarjetas de resumen
    expect(screen.getByText('Panel de control administrativo')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /aprobación de usuarios/i })).toBeInTheDocument();

    // Espera a que cargue la tabla con el usuario mock
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('juan@empresa.com')).toBeInTheDocument();
      expect(screen.getByText('ADMINISTRADOR_EMPRESA')).toBeInTheDocument();
    });

    // Verifica los botones de acción
    expect(screen.getByRole('button', { name: /aprobar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rechazar/i })).toBeInTheDocument();
  });

  it('abre el diálogo de rechazo al hacer clic en Rechazar', async () => {
    renderPantalla();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rechazar/i }));

    expect(screen.getByText('Rechazar registro de usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/La documentación de la empresa no coincide/i)).toBeInTheDocument();
  });
});
