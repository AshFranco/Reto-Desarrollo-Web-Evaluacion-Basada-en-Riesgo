import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { MOCK_EVALUACION_DETALLE, MOCK_EVIDENCIA } from '@/mocks/handlers';
import { db } from '@/lib/db';
import EjecutarEvaluacion from './EjecutarEvaluacion';

beforeEach(async () => {
  await db.open();
  await db.cola_sync.clear().catch(() => {});
});
afterEach(async () => {
  await db.cola_sync.clear().catch(() => {});
  await db.delete().catch(() => {});
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
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());
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

    // "Cumple" (C) se auto-guarda al hacer clic — también offline (encola)
    fireEvent.click(screen.getByRole('button', { name: 'Cumple' }));

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
  it('auto-guarda la respuesta contra el servidor al seleccionar "Cumple"', async () => {
    let llamadaAlServidor = false;
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => {
        llamadaAlServidor = true;
        return HttpResponse.json({ mensaje: 'Avance guardado.' });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    // "Cumple" (C) se auto-guarda al hacer clic, sin necesidad de pulsar "Guardar"
    fireEvent.click(screen.getByRole('button', { name: 'Cumple' }));

    await waitFor(() => expect(screen.getByText('✓ Guardado.')).toBeInTheDocument());
    expect(llamadaAlServidor).toBe(true);
  });

  it('al activar "Mostrar solo pendientes", filtra los criterios ya respondidos según el comportamiento estándar sin sobrecarga cognitiva', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () => {
        return HttpResponse.json({
          ...MOCK_EVALUACION_DETALLE,
          respuestas: [{ id: '1', idItemFicha: '2', idOpcionRespuesta: '1', observacion: null }],
        });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    // Activa el switch "Mostrar solo pendientes"
    const switchPendientes = screen.getByLabelText('Mostrar solo pendientes');
    fireEvent.click(switchPendientes);

    // Como el ítem ya está respondido, se oculta directamente bajo el filtro estándar
    await waitFor(() => expect(screen.queryByText('Ítem evaluable')).not.toBeInTheDocument());
  });

  it('en evidencia general, muestra un solo botón principal y abre el modal integrado con opciones de archivos y GPS', async () => {
    renderPantalla();
    await waitFor(() => expect(screen.getByText('Evidencia general de la evaluación (no ligada a un criterio puntual)')).toBeInTheDocument());

    // Fuera del modal no debe haber botones de GPS dispersos en la pantalla
    expect(screen.queryByText('Capturar GPS')).not.toBeInTheDocument();

    // El botón unificado de evidencia general está presente
    const btnEvidenciaGeneral = screen.getByRole('button', { name: 'Adjuntar evidencia general' });
    expect(btnEvidenciaGeneral).toBeInTheDocument();

    // Al hacer clic, abre el modal integrado
    fireEvent.click(btnEvidenciaGeneral);

    await waitFor(() => expect(screen.getByText('Adjuntar Evidencia General')).toBeInTheDocument());
    expect(screen.getByText('Subir Fotografías, Videos o Documentos')).toBeInTheDocument();
    expect(screen.getByText('Capturar Geolocalización GPS en Campo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capturar ubicación GPS' })).toBeInTheDocument();
  });

  it('muestra modal de advertencia y confirmación antes de eliminar un archivo de evidencia', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () => {
        return HttpResponse.json({
          ...MOCK_EVALUACION_DETALLE,
          evidencias: [MOCK_EVIDENCIA],
        });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('ff8b6ae7-81f6-4238-9627-c9e2e965a5e0.png')).toBeInTheDocument());

    // Al hacer clic en eliminar, NO elimina inmediatamente: abre diálogo de confirmación
    const btnEliminar = screen.getByLabelText('Eliminar evidencia');
    fireEvent.click(btnEliminar);

    await waitFor(() => expect(screen.getByText('Confirmar eliminación de archivo')).toBeInTheDocument());
    expect(screen.getByText(/¿Estás seguro de que deseas eliminar este archivo adjunto\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar archivo' })).toBeInTheDocument();

    // Cancelar cierra el diálogo sin eliminar
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByText('Confirmar eliminación de archivo')).not.toBeInTheDocument());
    expect(screen.getByText('ff8b6ae7-81f6-4238-9627-c9e2e965a5e0.png')).toBeInTheDocument();
  });
});
