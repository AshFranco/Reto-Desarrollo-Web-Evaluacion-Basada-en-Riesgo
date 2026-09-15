import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RestablecerContrasena from './RestablecerContrasena';

const mockRestablecerContrasena = vi.fn();
vi.mock('@/lib/auth/recuperacion', () => ({
  restablecerContrasena: (...args: any[]) => mockRestablecerContrasena(...args),
}));

describe('RestablecerContrasena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra advertencia si no se proporciona token en la URL', () => {
    render(
      <MemoryRouter initialEntries={['/restablecer-contrasena']}>
        <RestablecerContrasena />
      </MemoryRouter>
    );

    expect(screen.getByText(/No se encontró un token válido en el enlace/i)).toBeInTheDocument();
  });

  it('renderiza formulario de restablecimiento si hay token presente', () => {
    render(
      <MemoryRouter initialEntries={['/restablecer-contrasena?token=sample-test-token']}>
        <RestablecerContrasena />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Restablecer contraseña/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmar nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar nueva contraseña/i })).toBeInTheDocument();
  });

  it('llama a la API y muestra pantalla de éxito al completar el formulario válidamente', async () => {
    mockRestablecerContrasena.mockResolvedValueOnce({
      ok: true,
      mensaje: 'Contraseña restablecida exitosamente.',
    });

    render(
      <MemoryRouter initialEntries={['/restablecer-contrasena?token=token-123']}>
        <RestablecerContrasena />
      </MemoryRouter>
    );

    const inputNueva = screen.getByLabelText(/^Nueva contraseña/i);
    const inputConfirmar = screen.getByLabelText(/Confirmar nueva contraseña/i);
    const botonSubmit = screen.getByRole('button', { name: /Guardar nueva contraseña/i });

    fireEvent.change(inputNueva, { target: { value: 'SuperClave2026!' } });
    fireEvent.change(inputConfirmar, { target: { value: 'SuperClave2026!' } });
    fireEvent.click(botonSubmit);

    await waitFor(() => {
      expect(mockRestablecerContrasena).toHaveBeenCalledWith(
        'token-123',
        'SuperClave2026!',
        'SuperClave2026!',
      );
      expect(screen.getByText(/¡Contraseña restablecida!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ir a Iniciar Sesión/i })).toBeInTheDocument();
    });
  });
});
