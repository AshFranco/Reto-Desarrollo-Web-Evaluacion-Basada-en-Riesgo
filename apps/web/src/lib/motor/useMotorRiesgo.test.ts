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
    { id: '1', codigo: 'C',   valor: '1',   excluyeDelCalculo: false, generaNc: false },
    { id: '2', codigo: 'CP',  valor: '0.5', excluyeDelCalculo: false, generaNc: true  },
    { id: '3', codigo: 'IT',  valor: '0',   excluyeDelCalculo: false, generaNc: true  },
    { id: '4', codigo: 'N/A', valor: '0',   excluyeDelCalculo: true,  generaNc: false },
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
  peso: '1',
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
// Helpers para tests con múltiples ítems
// ---------------------------------------------------------------------------

function makeItems(count: number, idCriticidadFn?: (i: number) => string | null): CatalogoItemLocal[] {
  return Array.from({ length: count }, (_, i) => ({
    ...ITEM,
    id: String(100 + i),
    idCriticidad: idCriticidadFn ? idCriticidadFn(i) : null,
  }));
}

function makeRespuestas(
  items: CatalogoItemLocal[],
  codigoFn: (i: number) => RespuestaLocal['codigoOpcion'],
): RespuestaLocal[] {
  return items.map((item, i) => ({
    ...RESPUESTA_C,
    uuidLocal: `uuid-m${i}`,
    itemId: item.id,
    codigoOpcion: codigoFn(i),
  }));
}

// entradaCompleta mínima donde solo existe el factor automático (peso=1.0)
// → RE = puntaje del factor auto → RT = RP × RE = 1 × RE (con RP=1)
function makeEntradaRt(puntajeParaBajo: number, puntajeParaAlto: number): Omit<EntradaCalculo, 'respuestas'> {
  return {
    factoresManuales: [],
    factorAutomatico: {
      numero: 3,
      nombre: 'Cumplimiento con las BPM',
      peso: 1.0,
      opciones: [
        { id: 1, descripcion: '≤ 60%', puntaje: puntajeParaBajo, limiteInf: 0,     limiteSup: 60  },
        { id: 2, descripcion: '>60%',  puntaje: puntajeParaAlto, limiteInf: 60.01, limiteSup: 100 },
      ],
    },
    puntajesRpCategorias: [1],
    rangosCalificacion: ENTRADA_COMPLETA.rangosCalificacion,
    rangosFrecuencia:   ENTRADA_COMPLETA.rangosFrecuencia,
    reglaAprobacion:    ENTRADA_COMPLETA.reglaAprobacion,
  };
}

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

  // §11.1 caso 2 — todos IT → 0 % → no aprueba
  it('caso 2: todos IT → 0 % cumplimiento → no aprueba ni otorga permiso', () => {
    const respuestaIt: RespuestaLocal = { ...RESPUESTA_C, codigoOpcion: 'IT' };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaIt],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(0);
    expect(r!.aprueba).toBe(false);
    expect(r!.otorgaPermisoSanitario).toBe(false);
  });

  // §11.1 caso 3 — todos CP → 50 % → no aprueba
  it('caso 3: todos CP → 50 % cumplimiento → no aprueba', () => {
    const respuestaCp: RespuestaLocal = { ...RESPUESTA_C, codigoOpcion: 'CP' };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaCp],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(50);
    expect(r!.aprueba).toBe(false);
  });

  // §11.1 caso 4 — N/A no cuenta en el denominador
  it('caso 4: ítem N/A se excluye del denominador efectivo', () => {
    const items = [
      { ...ITEM, id: '10' },
      { ...ITEM, id: '11' },
      { ...ITEM, id: '12' },
    ];
    const respuestas: RespuestaLocal[] = [
      { ...RESPUESTA_C, uuidLocal: 'uuid-c1',  itemId: '10', codigoOpcion: 'C'   },
      { ...RESPUESTA_C, uuidLocal: 'uuid-na',  itemId: '11', codigoOpcion: 'N/A' },
      { ...RESPUESTA_C, uuidLocal: 'uuid-c2',  itemId: '12', codigoOpcion: 'C'   },
    ];
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas, catalogoItems: items, catalogoMeta: META, entradaCompleta: ENTRADA_COMPLETA }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.itemsNa).toBe(1);
    expect(r!.cumplimiento.denominadorEfectivo).toBe(2);
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(100);
  });

  // §11.1 caso 6 — 2 NC Críticas bloquean la aprobación aunque el porcentaje sea alto
  it('caso 6: 2 NC Críticas → no aprueba aunque el porcentaje sea 90 %', () => {
    const items = makeItems(10, i => (i < 2 ? 'C' : null));
    const respuestas = makeRespuestas(items, i => (i < 2 ? 'CP' : 'C'));
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas, catalogoItems: items, catalogoMeta: META, entradaCompleta: ENTRADA_COMPLETA }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(90);
    expect(r!.cumplimiento.ncCriticas).toBe(2);
    expect(r!.aprueba).toBe(false);
  });

  // §11.1 caso 7 — 6 NC Mayores superan el límite de 5
  it('caso 7: 6 NC Mayores con 85 % → no aprueba (regla NC_Mayores ≤ 5)', () => {
    const items = makeItems(20, i => (i < 6 ? 'M' : null));
    const respuestas = makeRespuestas(items, i => (i < 6 ? 'CP' : 'C'));
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas, catalogoItems: items, catalogoMeta: META, entradaCompleta: ENTRADA_COMPLETA }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(85);
    expect(r!.cumplimiento.ncMayores).toBe(6);
    expect(r!.aprueba).toBe(false);
  });

  // §11.1 caso 8 — justo sobre 60 % con 3 NC Mayores → aprueba
  it('caso 8: 70 % con 3 NC Mayores → aprueba (límite ≤ 5 NC Mayores)', () => {
    const items = makeItems(5, i => (i < 3 ? 'M' : null));
    const respuestas = makeRespuestas(items, i => (i < 3 ? 'CP' : 'C'));
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas, catalogoItems: items, catalogoMeta: META, entradaCompleta: ENTRADA_COMPLETA }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(70);
    expect(r!.cumplimiento.ncMayores).toBe(3);
    expect(r!.aprueba).toBe(true);
  });

  // §11.1 caso 9 — exactamente 60 % NO aprueba (la regla es > 60, no ≥)
  it('caso 9: exactamente 60 % → NO aprueba (la regla es > 60, no ≥ 60)', () => {
    const items = makeItems(10);
    const respuestas = makeRespuestas(items, i => (i < 6 ? 'C' : 'IT'));
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas, catalogoItems: items, catalogoMeta: META, entradaCompleta: ENTRADA_COMPLETA }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(60);
    expect(r!.aprueba).toBe(false);
  });

  // §11.1 caso 10 — RT exactamente 3.6 cae en el rango Anual (incluyeSuperior = true)
  it('caso 10: RT = 3.6 → Anual (el límite superior es inclusivo)', () => {
    const entrada = makeEntradaRt(3.6, 1.0);
    const respuestaIt: RespuestaLocal = { ...RESPUESTA_C, codigoOpcion: 'IT' };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaIt],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: entrada,
      }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.rtValor).toBeCloseTo(3.6, 5);
    expect(r!.frecuencia).toBe('Anual');
    expect(r!.nivelRiesgo).toBe('BAJO');
  });

  // §11.1 caso 11 — RT = 3.61 cae en Semestral (límite inferior de ese rango es exclusivo)
  it('caso 11: RT = 3.61 → Semestral (límite inferior del rango medio es exclusivo)', () => {
    const entrada = makeEntradaRt(3.0, 3.61);
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [RESPUESTA_C],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: entrada,
      }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.rtValor).toBeCloseTo(3.61, 5);
    expect(r!.frecuencia).toBe('Semestral');
    expect(r!.nivelRiesgo).toBe('MEDIO');
  });

  // §11.1 caso 12 — RT = 6.3 cae en Semestral (límite superior del rango medio es inclusivo)
  it('caso 12: RT = 6.3 → Semestral (límite superior del rango medio es inclusivo)', () => {
    const entrada = makeEntradaRt(6.3, 1.0);
    const respuestaIt: RespuestaLocal = { ...RESPUESTA_C, codigoOpcion: 'IT' };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaIt],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: entrada,
      }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.rtValor).toBeCloseTo(6.3, 5);
    expect(r!.frecuencia).toBe('Semestral');
  });

  // §11.1 caso 13 — RP es el máximo de las categorías del establecimiento
  it('caso 13: tres categorías de producto (Bajo=1, Medio=2, Alto=3) → RP = 3 → Semestral', () => {
    const entradaRp3: Omit<EntradaCalculo, 'respuestas'> = {
      ...ENTRADA_COMPLETA,
      puntajesRpCategorias: [1, 2, 3],
    };
    const { result } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [RESPUESTA_C],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: entradaRp3,
      }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.rpValor).toBe(3);
    // 100 % → RE ≈ 1.39, RT = 3 × 1.39 ≈ 4.18 → rango Semestral (3.6, 6.3]
    expect(r!.frecuencia).toBe('Semestral');
  });

  // §11.1 caso 14 — reproducción del cálculo completo con valores reales
  it('caso 14: cálculo de referencia — 90 % con 2 CP sin criticidad → Anual, aprueba, otorga permiso', () => {
    const items = makeItems(10);
    const respuestas = makeRespuestas(items, i => (i < 8 ? 'C' : 'CP'));
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas, catalogoItems: items, catalogoMeta: META, entradaCompleta: ENTRADA_COMPLETA }),
    );
    const r = result.current;
    expect(r).not.toBeNull();
    expect(r!.cumplimiento.porcentajeCumplimiento).toBe(90);
    expect(r!.aprueba).toBe(true);
    expect(r!.otorgaPermisoSanitario).toBe(true);
    expect(r!.frecuencia).toBe('Anual');
    expect(r!.fechaProximaInspeccion).toBeInstanceOf(Date);
  });

  // §11.1 caso 15 — cambiar el valor de CP en el catálogo no altera evaluaciones históricas
  it('caso 15: valor de CP actualizado en el catálogo no modifica el resultado histórico', () => {
    const respuestaCp: RespuestaLocal = { ...RESPUESTA_C, codigoOpcion: 'CP' };
    const metaActualizada: CatalogoMetaLocal = {
      ...META,
      opcionesRespuesta: META.opcionesRespuesta.map(o =>
        o.codigo === 'CP' ? { ...o, valor: '0.7' } : o,
      ),
    };

    const { result: historial } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaCp],
        catalogoItems: [ITEM],
        catalogoMeta: META,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );
    const { result: nueva } = renderHook(() =>
      useMotorRiesgo({
        respuestas: [respuestaCp],
        catalogoItems: [ITEM],
        catalogoMeta: metaActualizada,
        entradaCompleta: ENTRADA_COMPLETA,
      }),
    );

    // La evaluación histórica usa CP = 0.5 → 50 %
    expect(historial.current!.cumplimiento.porcentajeCumplimiento).toBe(50);
    // La evaluación con el catálogo actualizado usa CP = 0.7 → 70 %
    expect(nueva.current!.cumplimiento.porcentajeCumplimiento).toBe(70);
  });
});
