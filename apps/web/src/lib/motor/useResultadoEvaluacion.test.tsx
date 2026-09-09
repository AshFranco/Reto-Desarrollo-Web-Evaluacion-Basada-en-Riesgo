import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { db } from '@/lib/db';
import { server } from '@/mocks/node';
import { descargarCatalogo } from '@/lib/catalogo/loader';
import { descargarCatalogoMotor } from '@/lib/catalogo/loaderMotor';
import { MOCK_EVALUACION_DETALLE, MOCK_CATALOGO, MOCK_CATALOGO_MOTOR } from '@/mocks/handlers';
import type { EvaluacionDetalle, RespuestaItemRaw } from '@/lib/types';
import { useResultadoEvaluacion } from './useResultadoEvaluacion';

// El handler predeterminado devuelve MOCK_CATALOGO_MOTOR_RIESGO (formato raw del
// backend), pero loaderMotor.ts espera el formato Omit<EntradaCalculo,'respuestas'>.
// Sobreescribimos el handler para los tests que llaman a descargarCatalogoMotor().
const URL_MOTOR = 'http://localhost:3000/api/v1/motor-riesgo/catalogo';
const handlerMotorLocal = http.get(URL_MOTOR, () => HttpResponse.json(MOCK_CATALOGO_MOTOR));

// Evaluación con una respuesta 'C' sobre el ítem evaluable del catálogo mock
// (item id='2', peso='1', idCriticidad=null → opción id='1' código='C')
const RESPUESTA_C_SERVIDOR: RespuestaItemRaw = {
  id: 'r1',
  idEvaluacion: '1',
  idItemFicha: '2',
  idOpcionRespuesta: '1',
  idCriticidad: null,
  valorAplicado: '1',
  pesoAplicado: '1',
  excluidoDelCalculo: false,
  observacion: null,
  uuidLocal: 'uuid-srv-1',
  sincronizado: true,
};

const EVALUACION_CON_RESPUESTAS: EvaluacionDetalle = {
  ...(MOCK_EVALUACION_DETALLE as unknown as EvaluacionDetalle),
  respuestas: [RESPUESTA_C_SERVIDOR],
};

beforeEach(async () => {
  await db.open();
});
afterEach(() => {
  db.delete();
  server.resetHandlers();
});

describe('useResultadoEvaluacion', () => {
  it('retorna null cuando evaluacion no está definida', () => {
    const { result } = renderHook(() =>
      useResultadoEvaluacion(undefined, MOCK_CATALOGO.opcionesRespuesta),
    );
    expect(result.current).toBeNull();
  });

  it('retorna null cuando Dexie no tiene catálogo del motor descargado', async () => {
    // Solo descargamos el catálogo de ítems, NO el motor → entradaCompleta=null
    await descargarCatalogo();

    const { result } = renderHook(() =>
      useResultadoEvaluacion(EVALUACION_CON_RESPUESTAS, MOCK_CATALOGO.opcionesRespuesta),
    );

    await waitFor(() => {
      // catalogoMeta ya cargó pero entradaCompleta sigue null → debe ser null
      expect(result.current).toBeNull();
    });
  });

  it('retorna ResultadoRiesgo cuando todos los datos están en Dexie', async () => {
    server.use(handlerMotorLocal);
    await descargarCatalogo();
    await descargarCatalogoMotor();

    const { result } = renderHook(() =>
      useResultadoEvaluacion(EVALUACION_CON_RESPUESTAS, MOCK_CATALOGO.opcionesRespuesta),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const r = result.current!;
    // Respuesta C de peso 1 → 100 % cumplimiento
    expect(r.cumplimiento.porcentajeCumplimiento).toBe(100);
    expect(r.aprueba).toBe(true);
    expect(r.otorgaPermisoSanitario).toBe(true);
    expect(r.frecuencia).toBe('Anual');
    expect(r.fechaProximaInspeccion).toBeInstanceOf(Date);
  });

  it('retorna null cuando la evaluación no tiene respuestas guardadas', async () => {
    server.use(handlerMotorLocal);
    await descargarCatalogo();
    await descargarCatalogoMotor();

    const evaluacionSinRespuestas: EvaluacionDetalle = {
      ...(MOCK_EVALUACION_DETALLE as unknown as EvaluacionDetalle),
      respuestas: [],
    };

    const { result } = renderHook(() =>
      useResultadoEvaluacion(evaluacionSinRespuestas, MOCK_CATALOGO.opcionesRespuesta),
    );

    await waitFor(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current).toBeNull();
  });

  it('ignora respuestas cuyo idOpcionRespuesta no existe en el catálogo', async () => {
    server.use(handlerMotorLocal);
    await descargarCatalogo();
    await descargarCatalogoMotor();

    const evaluacionConOpcionDesconocida: EvaluacionDetalle = {
      ...(MOCK_EVALUACION_DETALLE as unknown as EvaluacionDetalle),
      respuestas: [{ ...RESPUESTA_C_SERVIDOR, idOpcionRespuesta: '999' }],
    };

    const { result } = renderHook(() =>
      useResultadoEvaluacion(evaluacionConOpcionDesconocida, MOCK_CATALOGO.opcionesRespuesta),
    );

    await waitFor(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Ninguna respuesta pudo resolverse → sin items válidos → null
    expect(result.current).toBeNull();
  });
});
