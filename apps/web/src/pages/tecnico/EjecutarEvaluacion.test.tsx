import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { MOCK_EVALUACION_DETALLE, MOCK_EVIDENCIA, MOCK_CATALOGO_MOTOR } from '@/mocks/handlers';
import { descargarCatalogo } from '@/lib/catalogo/loader';
import { descargarCatalogoMotor } from '@/lib/catalogo/loaderMotor';
import { db, type OperacionPendiente } from '@/lib/db';
import { comprimirFoto } from '@/lib/fotos/compressor';
import type { RespuestaItemRaw } from '@/lib/types';
import EjecutarEvaluacion from './EjecutarEvaluacion';

// La compresión real necesita Image/OffscreenCanvas, que jsdom no provee
// (ver src/lib/fotos/compressor.test.ts para esos mocks aparte). Acá solo
// interesa confirmar que se LLAMA con el archivo original antes de subir.
const BLOB_COMPRIMIDO = new Blob(['comprimida'], { type: 'image/jpeg' });
vi.mock('@/lib/fotos/compressor', () => ({
  comprimirFoto: vi.fn(async () => BLOB_COMPRIMIDO),
}));

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

  it('si navigator.onLine dice que hay red pero el POST falla igual, encola en vez de perder la respuesta', async () => {
    // No se llama ponerseOffline(): el navegador reporta conexión (caso real
    // de wifi conectado sin salida a internet), pero el fetch real falla.
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => HttpResponse.error())
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cumple' }));

    await waitFor(() => expect(screen.getByText('Guardado localmente — pendiente de sincronizar.')).toBeInTheDocument());

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

  it('sin conexión, comprime la foto y encola la evidencia en vez de bloquear la subida', async () => {
    ponerseOffline();
    renderPantalla();
    await waitFor(() => expect(screen.getByText('Evidencia general de la evaluación (no ligada a un criterio puntual)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Adjuntar evidencia general' }));
    await waitFor(() => expect(screen.getByText('Subir Fotografías, Videos o Documentos')).toBeInTheDocument());

    const input = screen.getByLabelText('Seleccionar archivos desde el dispositivo', { selector: 'input' });
    const foto = new File(['bytes-originales'], 'foto.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [foto] } });

    let pendientes: OperacionPendiente[] = [];
    await waitFor(async () => {
      pendientes = await db.cola_sync.where('tipo').equals('EVIDENCIA').toArray();
      expect(pendientes).toHaveLength(1);
    });
    const payload = pendientes[0]?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ evaluacionId: '1', tipo: 'FOTO', nombreArchivo: 'foto.jpg' });
    // Confirma que la compresión corrió antes de encolar (no que se saltó el
    // paso) -- no se puede verificar el contenido del blob después del
    // round-trip por IndexedDB: fake-indexeddb (el shim usado en tests) no
    // conserva Blobs anidados dentro de un objeto plano, los vuelve `{}`
    // (mismo tipo de límite de entorno que el FormData en useEvidencias.test.tsx).
    expect(comprimirFoto).toHaveBeenCalledTimes(1);
    expect(comprimirFoto).toHaveBeenCalledWith(foto);

    await waitFor(() => expect(screen.getByText('Evidencia guardada localmente — pendiente de sincronizar.')).toBeInTheDocument());
  });

  it('sin conexión, encola el punto GPS como evidencia sin comprimir (no es imagen)', async () => {
    ponerseOffline();
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: 18.4861, longitude: -69.9312 } } as GeolocationPosition)
    );
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Evidencia general de la evaluación (no ligada a un criterio puntual)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Adjuntar evidencia general' }));
    await waitFor(() => expect(screen.getByText('Capturar Geolocalización GPS en Campo')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Capturar ubicación GPS' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar archivo GeoJSON' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar archivo GeoJSON' }));

    await waitFor(() => expect(screen.getByText('Punto GPS guardado localmente — pendiente de sincronizar.')).toBeInTheDocument());

    const pendientes = await db.cola_sync.where('tipo').equals('EVIDENCIA').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.payload).toMatchObject({
      evaluacionId: '1', tipo: 'DOCUMENTO', latitud: 18.4861, longitud: -69.9312,
    });
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

  it('cada criterio respondido tiene su propio modal para adjuntar evidencia y localización geográfica', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () => {
        return HttpResponse.json({
          ...MOCK_EVALUACION_DETALLE,
          respuestas: [{ id: '99', idItemFicha: '2', codigoOpcion: 'C' }],
        });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    // El criterio tiene su propio botón "Adjuntar evidencia"
    const btnEvidenciaCriterio = screen.getByRole('button', { name: 'Adjuntar evidencia' });
    expect(btnEvidenciaCriterio).toBeInTheDocument();

    // Al hacer clic, abre el modal propio del criterio con opciones de archivos y GPS
    fireEvent.click(btnEvidenciaCriterio);

    await waitFor(() =>
      expect(screen.getByText(/Adjuntar Evidencia —.*Ítem evaluable/i)).toBeInTheDocument()
    );
    expect(screen.getByText('Subir Fotografías, Videos o Documentos')).toBeInTheDocument();
    expect(screen.getByText('Capturar Geolocalización GPS en Campo')).toBeInTheDocument();
    expect(screen.getByText(/Registra la ubicación geográfica específica de este criterio o hallazgo en formato GeoJSON/i)).toBeInTheDocument();
  });
});

describe('EjecutarEvaluacion — devuelta por el Coordinador (RF-18)', () => {
  const EVALUACION_DEVUELTA = {
    ...MOCK_EVALUACION_DETALLE,
    idEstado: 6,
    bloqueada: true,
    estado: { id: 6, codigo: 'DEVUELTA', nombre: 'Devuelta', esFinal: false, bloqueaDatos: true, orden: 6 },
  };

  it('muestra las observaciones del Coordinador de forma visible, no escondidas', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () => HttpResponse.json(EVALUACION_DEVUELTA)),
      http.get('http://localhost:3000/api/v1/evaluaciones/:id/observaciones', () =>
        HttpResponse.json([
          {
            id: '1', estado: 'Devuelta', codigoEstado: 'DEVUELTA', usuario: 'Coordinadora Ana',
            comentario: '[SOLICITAR_CORRECCION] Falta evidencia fotográfica en almacenamiento.',
            fechaHora: '2026-03-02T10:00:00.000Z',
          },
        ])
      )
    );

    renderPantalla();

    await waitFor(() => expect(screen.getByText('Evaluación devuelta por el Coordinador')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Falta evidencia fotográfica en almacenamiento\./)).toBeInTheDocument());
    expect(screen.getByText(/Coordinadora Ana/)).toBeInTheDocument();
    // No debe caer en la vista bloqueada de solo lectura que se usa para FINALIZADA/EN_REVISION
    expect(screen.queryByText('Visualizando Ficha BPM (Modo solo lectura)')).not.toBeInTheDocument();
  });

  it('al guardar la primera respuesta llama a corregir() para reactivar la evaluación', async () => {
    let seLlamoCorregir = false;
    let cuerpoCorregir: unknown = null;
    let seLlamoRespuestasNormal = false;
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () => HttpResponse.json(EVALUACION_DEVUELTA)),
      http.get('http://localhost:3000/api/v1/evaluaciones/:id/observaciones', () => HttpResponse.json([])),
      http.patch('http://localhost:3000/api/v1/evaluaciones/:id/corregir', async ({ request }) => {
        seLlamoCorregir = true;
        cuerpoCorregir = await request.json();
        return HttpResponse.json({
          mensaje: 'Correcciones registradas exitosamente.',
          evaluacion: {
            ...EVALUACION_DEVUELTA,
            idEstado: 2,
            bloqueada: false,
            estado: { id: 2, codigo: 'EN_CURSO', nombre: 'En Curso', esFinal: false, bloqueaDatos: false, orden: 2 },
          },
        });
      }),
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () => {
        seLlamoRespuestasNormal = true;
        return HttpResponse.json({ mensaje: 'Avance guardado.' });
      })
    );

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Evaluación devuelta por el Coordinador')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cumple' }));

    await waitFor(() => expect(seLlamoCorregir).toBe(true));
    expect(cuerpoCorregir).toEqual({ respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });
    expect(seLlamoRespuestasNormal).toBe(false);
  });
});

describe('EjecutarEvaluacion — vista previa local del motor de riesgo', () => {
  const RESPUESTA_C_SERVIDOR: RespuestaItemRaw = {
    id: 'r1', idEvaluacion: '1', idItemFicha: '2', idOpcionRespuesta: '1',
    idCriticidad: null, valorAplicado: '1', pesoAplicado: '1',
    excluidoDelCalculo: false, observacion: null, uuidLocal: 'uuid-srv-1', sincronizado: true,
  };

  it('muestra el % de cumplimiento calculado localmente (mismo motor que el servidor)', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () =>
        HttpResponse.json({ ...MOCK_EVALUACION_DETALLE, respuestas: [RESPUESTA_C_SERVIDOR] })
      ),
      http.get('http://localhost:3000/api/v1/motor-riesgo/catalogo', () => HttpResponse.json(MOCK_CATALOGO_MOTOR))
    );
    await descargarCatalogo();
    await descargarCatalogoMotor();

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    // Única respuesta es 'C' (valor 1) sobre el único ítem evaluable (peso 1) → 100%
    await waitFor(() => expect(screen.getByText(/Cumplimiento BPM en vivo/)).toBeInTheDocument());
    expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
  });

  it('no muestra la vista previa si el catálogo del motor no se ha descargado todavía', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/evaluaciones/:id', () =>
        HttpResponse.json({ ...MOCK_EVALUACION_DETALLE, respuestas: [RESPUESTA_C_SERVIDOR] })
      )
    );
    // No se llama a descargarCatalogo()/descargarCatalogoMotor(): primera sesión offline

    renderPantalla();
    await waitFor(() => expect(screen.getByText('Ítem evaluable')).toBeInTheDocument());

    expect(screen.queryByText('Cumplimiento BPM en vivo:')).not.toBeInTheDocument();
  });
});

