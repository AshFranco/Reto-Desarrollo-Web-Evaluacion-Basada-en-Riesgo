import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import { RoleRoute } from './RoleRoute';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderConRuta(rutaInicial: string, rolesPermitidos: string[]) {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <Routes>
        <Route path="/login" element={<div>Pantalla de login</div>} />
        <Route path="/no-autorizado" element={<div>Sin autorización</div>} />
        <Route element={<RoleRoute rolesPermitidos={rolesPermitidos} />}>
          <Route path="/admin" element={<div>Panel de administrador</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RoleRoute', () => {
  it('redirige a /login si no hay ninguna sesión guardada', async () => {
    renderConRuta('/admin', ['ADMINISTRADOR']);

    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
    expect(screen.queryByText('Panel de administrador')).not.toBeInTheDocument();
  });

  it('deja pasar si hay sesión válida y el rol coincide', async () => {
    await saveSession({
      accessToken: 'token-valido',
      usuario: { id: '1', nombreCompleto: 'Ana Admin', rol: 'ADMINISTRADOR', empresaId: null },
    });

    renderConRuta('/admin', ['ADMINISTRADOR']);

    await waitFor(() => expect(screen.getByText('Panel de administrador')).toBeInTheDocument());
  });

  it('redirige a /no-autorizado si la sesión es válida pero el rol no está permitido', async () => {
    await saveSession({
      accessToken: 'token-valido',
      usuario: { id: '2', nombreCompleto: 'Juan Técnico', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });

    renderConRuta('/admin', ['ADMINISTRADOR']);

    await waitFor(() => expect(screen.getByText('Sin autorización')).toBeInTheDocument());
    expect(screen.queryByText('Panel de administrador')).not.toBeInTheDocument();
  });

  it('si el token venció pero el refresh silencioso funciona y el rol coincide, deja pasar', async () => {
    await db.sesion.put({
      id: 1,
      accessToken: 'token-vencido',
      expiresAt: Date.now() - 1000,
      usuario: { id: '1', nombreCompleto: 'Ana Admin', rol: 'ADMINISTRADOR', empresaId: null },
    });
    // El handler por defecto de /auth/refresh en mocks/handlers.ts responde 200.

    renderConRuta('/admin', ['ADMINISTRADOR']);

    await waitFor(() => expect(screen.getByText('Panel de administrador')).toBeInTheDocument());
  });
});
