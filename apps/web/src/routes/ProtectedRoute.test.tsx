import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import { ProtectedRoute } from './ProtectedRoute';

beforeEach(() => db.open());
afterEach(() => db.delete());

function renderConRuta(rutaInicial: string) {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <Routes>
        <Route path="/login" element={<div>Pantalla de login</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Pantalla protegida</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirige a /login si no hay sesión guardada y el refresh silencioso también falla', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/refresh', () => new HttpResponse(null, { status: 401 }))
    );

    renderConRuta('/');

    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
    expect(screen.queryByText('Pantalla protegida')).not.toBeInTheDocument();
  });

  it('deja pasar a la ruta protegida si ya hay una sesión válida', async () => {
    await saveSession({
      accessToken: 'token-valido',
      usuario: { id: '1', nombreCompleto: 'Ana Pérez', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });

    renderConRuta('/');

    await waitFor(() => expect(screen.getByText('Pantalla protegida')).toBeInTheDocument());
  });

  it('si el token guardado ya venció pero el refresh silencioso funciona, deja pasar sin ir a /login', async () => {
    await db.sesion.put({
      id: 1,
      accessToken: 'token-vencido',
      expiresAt: Date.now() - 1000,
      usuario: { id: '1', nombreCompleto: 'Ana Pérez', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
    // El handler por defecto de /auth/refresh en mocks/handlers.ts responde 200 con un access token nuevo.

    renderConRuta('/');

    await waitFor(() => expect(screen.getByText('Pantalla protegida')).toBeInTheDocument());
  });
});
