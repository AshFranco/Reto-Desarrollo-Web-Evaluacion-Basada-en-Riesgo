import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMotorRiesgo } from './useMotorRiesgo';
import type { CatalogoItemLocal, CatalogoMetaLocal, RespuestaLocal } from '@/lib/db';
import type { EntradaCalculo } from '@ebr/risk-engine';

// ---------------------------------------------------------------------------
// Fixtures base (sin catalogoItems ni entradaCompleta)
// ---------------------------------------------------------------------------

const META: CatalogoMetaLocal = {
  id: 1,
  versionFichaId: '1',
  descargadoEn: Date.now(),
  opcionesRespuesta: [
    { id: '1', codigo: 'C',   nombre: 'Cumple',           valor: 1.0, excluyeDelCalculo: false, generaNc: false },
    { id: '2', codigo: 'CP',  nombre: 'Cumple Parcial',    valor: 0.5, excluyeDelCalculo: false, generaNc: true  },
    { id: '3', codigo: 'IT',  nombre: 'Incumple Total',    valor: 0.0, excluyeDelCalculo: false, generaNc: true  },
    { id: '4', codigo: 'N/A', nombre: 'No Aplica',         valor: 0.0, excluyeDelCalculo: true,  generaNc: false },
  ],
};

const ITEM: CatalogoItemLocal = {
  id: '2',
  versionFichaId: '1',
  idPadre: '1',
  numeracion: '1.1',
  titulo: 'Criterio de prueba',
  nivel: 4,
  orden: 1,
  esEvaluable: true,
  peso: 1.0,
  idCriticidad: null,
};

const RESPUESTA_C: RespuestaLocal = {
  uuidLocal: 'uuid-1',
  evaluacionUuid: 'eval-1',
  itemId: '2',
  codigoOpcion: 'C',
  nivelCriticidad: null,
  observacion: '',
  capturaEn: Date.now(),
};

// ---------------------------------------------------------------------------
// Entrada completa mínima para el cálculo total (espeja seeds de la BD)
// ---------------------------------------------------------------------------

const ENTRADA_COMPLETA: Omit<EntradaCalculo, 'respuestas'> = {
  factoresManuales: [
    { numero: 1, nombre: 'Volumen de producción',       peso: 0.16, puntaje: 1.00, esAutomatico: false },
    { numero: 2, nombre: 'Implementación HACCP',        peso: 0.09, puntaje: 3.00, esAutomatico: false },
    { numero: 4, nombre: 'Proveedor INABIE',            peso: 0.05, puntaje: 2.33, esAutomatico: false },
    { numero: 5, nombre: 'Rechazos Registro Sanitario', peso: 0.06, puntaje: 1.67, esAutomatico: false },
    { numero: 6, nombre: 'Plan de muestreo',            peso: 0.08, puntaje: 2.33, esAutomatico: false },
  ],
  factorAutomatico: {
    numero: 3,
    nombre: 'Cumplimiento con las BPM',
    peso: 0.56,
    opciones: [
      { id: 1, descripcion: '≤ 60%',      puntaje: 3.00, limiteInf: 0,     limiteSup: 60  },
      { id: 2, descripcion: '>60% - 70%', puntaje: 2.33, limiteInf: 60.01, limiteSup: 70  },
      { id: 3, descripcion: '>70% - 80%', puntaje: 1.67, limiteInf: 70.01, limiteSup: 80  },
      { id: 4, descripcion: '>80%',       puntaje: 1.00, limiteInf: 80.01, limiteSup: 100 },
    ],
  },
  puntajesRpCategorias: [1],
  rangosCalificacion: [
    { limiteInferior: 0,  limiteSuperior: 60,  incluyeInferior: true,  incluyeSuperior: true,  descripcion: 'Condiciones inaceptables', accion: 'Considerar cierre' },
    { limiteInferior: 60, limiteSuperior: 70,  incluyeInferior: false, incluyeSuperior: true,  descripcion: 'Condiciones deficientes',  accion: 'Urge corregir' },
    { limiteInferior: 70, limiteSuperior: 80,  incluyeInferior: false, incluyeSuperior: true,  descripcion: 'Condiciones regulares',    accion: 'Necesario hacer correcciones' },
    { limiteInferior: 80, limiteSuperior: 100, incluyeInferior: false, incluyeSuperior: true,  descripcion: 'Buenas condiciones',       accion: 'Hacer algunas correcciones' },
  ],
  rangosFrecuencia: [
    { id: 1, limiteInferior: 1.0, limiteSuperior: 3.6, incluyeInferior: true,  incluyeSuperior: true,  nivelRiesgo: 'BAJO',  frecuencia: 'Anual',      mesesHastaProxima: 12 },
    { id: 2, limiteInferior: 3.6, limiteSuperior: 6.3, incluyeInferior: false, incluyeSuperior: true,  nivelRiesgo: 'MEDIO', frecuencia: 'Semestral',  mesesHastaProxima: 6  },
    { id: 3, limiteInferior: 6.3, limiteSuperior: 9.0, incluyeInferior: false, incluyeSuperior: true,  nivelRiesgo: 'ALTO',  frecuencia: 'Trimestral', mesesHastaProxima: 3  },
  ],
  reglaAprobacion: {
    porcentajeMinimoAprobacion: 60,
    maxNcCriticas: 1,
    maxNcMayores: 5,
    porcentajePermisoSanitario: 81,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMotorRiesgo', () => {
  it('retorna null cuando no hay respuestas', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: [], catalogoMeta: META }),
    );
    expect(result.current).toBeNull();
  });

  it('retorna null cuando catalogoMeta es null', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: [RESPUESTA_C], catalogoMeta: null }),
    );
    expect(result.current).toBeNull();
  });

  it('retorna null cuando entradaCompleta no está disponible (datos offline aún no descargados)', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: [RESPUESTA_C], catalogoMeta: META }),
    );
    expect(result.current).toBeNull();
  });

  it('retorna null cuando ninguna respuesta coincide con los items del catálogo', () => {
    const itemDeOtraVersion: CatalogoItemLocal = { ...ITEM, id: '999' };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [RESPUESTA_C],
        catalogoItems: [itemDeOtraVersion],
        catalogoMeta: META,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );
    expect(result.current).toBeNull();
  });

  it('calcula ResultadoRiesgo completo cuando todos los datos están disponibles', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [RESPUESTA_C],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );

    const r = result.current;
    expect(r).not.toBeNull();
    // 1 respuesta C de peso 1 → 100 % cumplimiento
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(100);
    expect(r!.cumplimiento.ncCriticas).toBe(0);
    expect(r!.aprueba).toBe(true);
    // >81 % → otorga permiso sanitario
    expect(r!.otorgaPermisoSanitario).toBe(true);
    // RP = 1 (LOW), factor auto con 100% → puntaje 1.00; RT debe ser Anual
    expect(r!.rpValor).toBe(1);
    expect(r!.frecuencia).toBe('Anual');
    expect(r!.nivelRiesgo).toBe('BAJO');
    expect(r!.fechaProximaInspeccion).toBeInstanceOf(Date);
  });

  it('retorna null sin lanzar cuando el engine falla (p.ej. todos N/A)', () => {
    const respuestaNa: RespuestaLocal = { ...RESPUESTA_C, codigoOpcion: 'N/A' };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaNa],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );
    expect(result.current).toBeNull();
  });
});
