import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { db } from '@/lib/db';
import { enqueue, marcarError } from '@/lib/sync/queue';
import { useSincronizacionEvaluacion } from './useSincronizacionEvaluacion';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('useSincronizacionEvaluacion', () => {
  it('no trae nada si no se pasa evaluacionId', async () => {
    const { result } = renderHook(() => useSincronizacionEvaluacion(undefined));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.operaciones).toEqual([]);
  });

  it('trae solo las operaciones de la evaluación indicada', async () => {
    await enqueue('RESPUESTAS', { evaluacionServerId: '1', respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });
    await enqueue('RESPUESTAS', { evaluacionServerId: '999', respuestas: [{ itemId: '5', codigoOpcion: 'C' }] });

    const { result } = renderHook(() => useSincronizacionEvaluacion('1'));
    await waitFor(() => expect(result.current.operaciones).toHaveLength(1));
    expect(result.current.pendientes).toHaveLength(1);
  });

  it('separa las operaciones en error de las pendientes', async () => {
    const uuid = await enqueue('RESPUESTAS', { evaluacionServerId: '1', respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });
    for (let i = 0; i < 10; i++) await marcarError(uuid, 'fallo de red');

    const { result } = renderHook(() => useSincronizacionEvaluacion('1'));
    await waitFor(() => expect(result.current.errores).toHaveLength(1));
    expect(result.current.pendientes).toHaveLength(0);
    expect(result.current.errores[0]?.errorMsg).toBe('fallo de red');
  });

  it('incluye la evidencia encolada (guarda su id como evaluacionId) entre las pendientes y las fallidas de su evaluación', async () => {
    const blob = new Blob(['{}'], { type: 'application/geo+json' });
    const pendiente = await enqueue('EVIDENCIA', { evaluacionId: '1', tipo: 'DOCUMENTO', blob, nombreArchivo: 'a.geojson' });
    const fallida = await enqueue('EVIDENCIA', { evaluacionId: '1', tipo: 'FOTO', blob, nombreArchivo: 'b.png' });
    await enqueue('EVIDENCIA', { evaluacionId: '999', tipo: 'FOTO', blob, nombreArchivo: 'otra.png' });
    for (let i = 0; i < 10; i++) await marcarError(fallida, 'HTTP 500');

    const { result } = renderHook(() => useSincronizacionEvaluacion('1'));
    await waitFor(() => expect(result.current.operaciones).toHaveLength(2));
    expect(result.current.pendientes.map((o) => o.uuidLocal)).toEqual([pendiente]);
    expect(result.current.errores.map((o) => o.uuidLocal)).toEqual([fallida]);
  });

  it('arma el mapa de respuestas encoladas por itemId, quedándose con la más reciente', async () => {
    await enqueue('RESPUESTAS', { evaluacionServerId: '1', respuestas: [{ itemId: '2', codigoOpcion: 'C' }] });
    await enqueue('RESPUESTAS', {
      evaluacionServerId: '1',
      respuestas: [{ itemId: '2', codigoOpcion: 'IT', nivelCriticidad: 'M', observacion: 'corregido' }],
    });

    const { result } = renderHook(() => useSincronizacionEvaluacion('1'));
    await waitFor(() => expect(result.current.operaciones).toHaveLength(2));
    expect(result.current.respuestasEncoladasPorItem.get('2')).toEqual({
      itemId: '2',
      codigoOpcion: 'IT',
      nivelCriticidad: 'M',
      observacion: 'corregido',
    });
  });
});
