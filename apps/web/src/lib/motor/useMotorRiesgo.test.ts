import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMotorRiesgo } from './useMotorRiesgo';
import type { RespuestaLocal, CatalogoMetaLocal } from '@/lib/db';

const META: CatalogoMetaLocal = {
  id: 1,
  versionFichaId: '1',
  descargadoEn: Date.now(),
  opcionesRespuesta: [
    { id: '1', codigo: 'C', nombre: 'Cumple', valor: 1.0, excluyeDelCalculo: false, generaNc: false },
  ],
};

const RESPUESTAS: RespuestaLocal[] = [
  {
    uuidLocal: crypto.randomUUID(),
    evaluacionUuid: 'eval-1',
    itemId: '2',
    codigoOpcion: 'C',
    nivelCriticidad: null,
    observacion: '',
    capturaEn: Date.now(),
  },
];

describe('useMotorRiesgo', () => {
  it('retorna null cuando no hay respuestas', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: [], catalogoMeta: META })
    );
    expect(result.current).toBeNull();
  });

  it('retorna null cuando catalogoMeta es null', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: RESPUESTAS, catalogoMeta: null })
    );
    expect(result.current).toBeNull();
  });

  it('retorna null hasta que haya datos de factores (brecha de backend)', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: RESPUESTAS, catalogoMeta: META })
    );
    expect(result.current).toBeNull();
  });
});
