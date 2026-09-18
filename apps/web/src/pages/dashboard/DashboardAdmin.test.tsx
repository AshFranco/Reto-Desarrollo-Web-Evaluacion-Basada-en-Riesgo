import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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

  it('muestra la cédula, el teléfono y el enlace a la carta de autorización antes de aprobar/rechazar (RF-02)', async () => {
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Juan Pérez')).toBeInTheDocument());

    expect(screen.getByText('001-1234567-8')).toBeInTheDocument();
    expect(screen.getByText('+18095551234')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver carta de autorización/i })).toHaveAttribute(
      'href',
      'https://storage.example.com/cartas/carta-juan.pdf'
    );
  });

  it('Tab "Gestión de usuarios y roles": lista todos los usuarios con su rol y estado', async () => {
    renderPantalla();

    fireEvent.click(screen.getByRole('tab', { name: /gestión de usuarios y roles/i }));

    await waitFor(() => expect(screen.getByText('Carlos Técnico')).toBeInTheDocument());
    expect(screen.getByText('Empresa Delegada SRL')).toBeInTheDocument();
    // La cuenta de Administrador del Sistema debe verse protegida, no editable.
    expect(screen.getAllByText('Administrador (Protegido)').length).toBeGreaterThan(0);
  });

  it('Tab "Gestión de usuarios y roles": permite cambiar el rol de un usuario no-admin', async () => {
    renderPantalla();

    fireEvent.click(screen.getByRole('tab', { name: /gestión de usuarios y roles/i }));
    await waitFor(() => expect(screen.getByText('Carlos Técnico')).toBeInTheDocument());

    const filaCarlos = screen.getByText('Carlos Técnico').closest('tr');
    expect(filaCarlos).not.toBeNull();
    fireEvent.click(within(filaCarlos as HTMLElement).getByRole('button', { name: /cambiar rol/i }));

    expect(screen.getByText('Asignar nuevo rol a usuario')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /guardar rol/i }));

    await waitFor(() => expect(screen.queryByText('Asignar nuevo rol a usuario')).not.toBeInTheDocument());
  });

  it('Tab "Gestión de tipos de establecimiento": lista los tipos y permite crear uno nuevo', async () => {
    renderPantalla();

    fireEvent.click(screen.getByRole('tab', { name: /gestión de tipos de establecimiento/i }));

    await waitFor(() =>
      expect(screen.getByText('Planta de Procesamiento de Alimentos')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /nuevo tipo/i }));
    fireEvent.change(screen.getByLabelText(/^Nombre del tipo/), { target: { value: 'Restaurante' } });
    fireEvent.click(screen.getByRole('button', { name: /crear tipo/i }));

    await waitFor(() => expect(screen.queryByText('Nuevo Tipo de Establecimiento')).not.toBeInTheDocument());
  });
});
