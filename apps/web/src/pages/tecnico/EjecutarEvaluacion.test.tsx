import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import EjecutarEvaluacion from './EjecutarEvaluacion';

beforeEach(() => db.open());
afterEach(() => {
  db.delete();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tecnico/evaluaciones/1']}>
        <Routes>
          <Route path="/tecnico/evaluaciones/:evaluacionId" element={<EjecutarEvaluacion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Simula estar sin conexión, igual que haría el navegador real al perder la señal. */
function ponerseOffline() {
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
}

describe('EjecutarEvaluacion — sin conexión', () => {
  it('muestra el chip "Sin conexión" cuando no hay red', async () => {
    ponerseOffline();
    renderPantalla();

    await waitFor(() => expect(screen.getByText('Sin conexión')).toBeInTheDocument());
  });

  it('al guardar una respuesta sin conexión, la encola en vez de llamar al servidor', async () => {
    ponerseOffline();
    let llamadaAlServidor = false;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => {
        llamadaAlServidor = true;
        return HttpResponse.json({ mensaje: 'Avance guardado.' });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cumple' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('Guardado localmente — pendiente de sincronizar.')).toBeInTheDocument());
    expect(llamadaAlServidor).toBe(false);

    const pendientes = await db.cola_sync.where('tipo').equals('RESPUESTAS').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toMatchObject({
      evaluacionServerId: '1',
      respuestas: [{ itemId: '2', codigoOpcion: 'C' }],
    });
  });

  it('al iniciar la evaluación (estado PROGRAMADA) sin conexión, encola INICIAR_EVALUACION en vez de llamar al servidor', async () => {
    ponerseOffline();
    let llamadaAlServidor = false;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/iniciar', () => {
        llamadaAlServidor = true;
        return HttpResponse.json({});
      })
    );

    renderPantalla();

    await waitFor(async () => {
      const ops = await db.cola_sync.where('tipo').equals('INICIAR_EVALUACION').toArray();
      expect(ops).toHaveLength(1);
      expect(ops[0]?.payload).toMatchObject({ evaluacionServerId: '1' });
    });
    expect(llamadaAlServidor).toBe(false);
  });

  it('muestra las operaciones que llegaron a estado error después de agotar los reintentos', async () => {
    await db.cola_sync.add({
      uuidLocal: 'op-error-1',
      tipo: 'RESPUESTAS',
      payload: { evaluacionServerId: '1', respuestas: [{ itemId: '2', codigoOpcion: 'C' }] },
      timestamp: Date.now(),
      intentos: 10,
      estado: 'error',
      errorMsg: 'HTTP 500',
    });

    renderPantalla();

    await waitFor(() => expect(screen.getByText(/no se pudieron enviar al servidor/)).toBeInTheDocument());
    expect(screen.getByText(/RESPUESTAS: HTTP 500/)).toBeInTheDocument();
  });
});

describe('EjecutarEvaluacion — en línea (comportamiento existente sin romper)', () => {
  it('guarda la respuesta contra el servidor normalmente cuando hay conexión', async () => {
    let llamadaAlServidor = false;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => {
        llamadaAlServidor = true;
        return HttpResponse.json({ mensaje: 'Avance guardado.' });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cumple' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('Guardado.')).toBeInTheDocument());
    expect(llamadaAlServidor).toBe(true);
  });
});
