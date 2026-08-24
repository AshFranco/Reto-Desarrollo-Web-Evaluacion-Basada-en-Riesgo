import { describe, it, expect } from 'vitest';
import {
  calcularCumplimiento,
  calcularRe,
  calcularRp,
  calcularRiesgo,
  resolverFrecuencia,
  evaluarAprobacion,
  ErrorMotorRiesgo,
  type OpcionRespuesta,
  type Respuesta,
  type FactorEvaluado,
  type RangoFrecuencia,
  type RangoCalificacion,
  type ReglaAprobacion,
} from '../src/index';

// ---------------------------------------------------------------------
// Datos de catálogo (replican los seeds de db/02 y db/03)
// ---------------------------------------------------------------------

const C: OpcionRespuesta   = { id: 1, codigo: 'C',   valor: 1.0, excluyeDelCalculo: false, generaNc: false };
const CP: OpcionRespuesta  = { id: 2, codigo: 'CP',  valor: 0.5, excluyeDelCalculo: false, generaNc: true  };
const IT: OpcionRespuesta  = { id: 3, codigo: 'IT',  valor: 0.0, excluyeDelCalculo: false, generaNc: true  };
const NA: OpcionRespuesta  = { id: 4, codigo: 'N/A', valor: 0.0, excluyeDelCalculo: true,  generaNc: false };

const TOTAL_CRITERIOS = 45;

function respuestas(cfg: { c?: number; cp?: number; it?: number; na?: number; criticidad?: 'C' | 'M' | 'Me' }): Respuesta[] {
  const { c = 0, cp = 0, it = 0, na = 0, criticidad = 'M' } = cfg;
  const out: Respuesta[] = [];
  let id = 0;
  const push = (op: OpcionRespuesta, n: number) => {
    for (let i = 0; i < n; i++) out.push({ idItemFicha: ++id, opcion: op, peso: 1.0, criticidad });
  };
  push(C, c); push(CP, cp); push(IT, it); push(NA, na);
  return out;
}

const RANGOS_FRECUENCIA: RangoFrecuencia[] = [
  { id: 1, limiteInferior: 1.0, limiteSuperior: 3.6, incluyeInferior: true,  incluyeSuperior: true, nivelRiesgo: 'BAJO',  frecuencia: 'Anual',      mesesHastaProxima: 12 },
  { id: 2, limiteInferior: 3.6, limiteSuperior: 6.3, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: 'MEDIO', frecuencia: 'Semestral',  mesesHastaProxima: 6  },
  { id: 3, limiteInferior: 6.3, limiteSuperior: 9.0, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: 'ALTO',  frecuencia: 'Trimestral', mesesHastaProxima: 3  },
];

const RANGOS_CALIFICACION: RangoCalificacion[] = [
  { limiteInferior: 0,  limiteSuperior: 60,  incluyeInferior: true,  incluyeSuperior: true, descripcion: 'Condiciones inaceptables', accion: 'Considerar cierre' },
  { limiteInferior: 60, limiteSuperior: 70,  incluyeInferior: false, incluyeSuperior: true, descripcion: 'Condiciones deficientes',  accion: 'Urge corregir' },
  { limiteInferior: 70, limiteSuperior: 80,  incluyeInferior: false, incluyeSuperior: true, descripcion: 'Condiciones regulares',    accion: 'Necesario hacer correcciones' },
  { limiteInferior: 80, limiteSuperior: 100, incluyeInferior: false, incluyeSuperior: true, descripcion: 'Buenas condiciones',       accion: 'Hacer algunas correcciones' },
];

const REGLA: ReglaAprobacion = {
  porcentajeMinimoAprobacion: 60,
  maxNcCriticas: 1,
  maxNcMayores: 5,
  porcentajePermisoSanitario: 81,
};

const FACTORES_MANUALES: FactorEvaluado[] = [
  { numero: 1, nombre: 'Volumen de producción',        peso: 0.16, puntaje: 1.00, esAutomatico: false },
  { numero: 2, nombre: 'Implementación HACCP',         peso: 0.09, puntaje: 3.00, esAutomatico: false },
  { numero: 4, nombre: 'Proveedor INABIE',             peso: 0.05, puntaje: 2.33, esAutomatico: false },
  { numero: 5, nombre: 'Rechazos Registro Sanitario',  peso: 0.06, puntaje: 1.67, esAutomatico: false },
  { numero: 6, nombre: 'Plan de muestreo',             peso: 0.08, puntaje: 2.33, esAutomatico: false },
];

const FACTOR_AUTO = {
  numero: 3,
  nombre: 'Cumplimiento con las BPM',
  peso: 0.56,
  opciones: [
    { id: 1, descripcion: '≤ 60%',      puntaje: 3.00, limiteInf: 0,     limiteSup: 60 },
    { id: 2, descripcion: '>60% - 70%', puntaje: 2.33, limiteInf: 60.01, limiteSup: 70 },
    { id: 3, descripcion: '>70% - 80%', puntaje: 1.67, limiteInf: 70.01, limiteSup: 80 },
    { id: 4, descripcion: '>80%',       puntaje: 1.00, limiteInf: 80.01, limiteSup: 100 },
  ],
};

// =====================================================================
// CP-01 a CP-05 — Porcentaje de cumplimiento
// =====================================================================

describe('Cálculo del porcentaje de cumplimiento', () => {
  it('CP-01: todos C → 100%', () => {
    const r = calcularCumplimiento(respuestas({ c: TOTAL_CRITERIOS }));
    expect(r.porcentajeCumplimiento).toBe(100);
    expect(r.denominadorEfectivo).toBe(45);
  });

  it('CP-02: todos IT → 0%', () => {
    const r = calcularCumplimiento(respuestas({ it: TOTAL_CRITERIOS }));
    expect(r.porcentajeCumplimiento).toBe(0);
    expect(r.ncMayores).toBe(45);
  });

  it('CP-03: todos CP → 50%', () => {
    const r = calcularCumplimiento(respuestas({ cp: TOTAL_CRITERIOS }));
    expect(r.porcentajeCumplimiento).toBe(50);
  });

  it('CP-04: N/A sale del DENOMINADOR, no cuenta como cero', () => {
    // 35 C + 10 N/A = 100%, NO 77.78%
    const r = calcularCumplimiento(respuestas({ c: 35, na: 10 }));
    expect(r.porcentajeCumplimiento).toBe(100);
    expect(r.denominadorEfectivo).toBe(35);
    expect(r.puntosExcluidosNa).toBe(10);
    expect(r.itemsNa).toBe(10);
  });

  it('CP-05: todos N/A → error, no división por cero', () => {
    expect(() => calcularCumplimiento(respuestas({ na: TOTAL_CRITERIOS })))
      .toThrow(ErrorMotorRiesgo);
  });
});

// =====================================================================
// CP-06 a CP-09 — Regla de aprobación
// =====================================================================

describe('Regla de aprobación', () => {
  it('CP-06: 2 NC Críticas no aprueba aunque el porcentaje sea 95%', () => {
    const c = calcularCumplimiento([
      ...respuestas({ c: 43 }),
      { idItemFicha: 44, opcion: CP, peso: 1, criticidad: 'C' },
      { idItemFicha: 45, opcion: CP, peso: 1, criticidad: 'C' },
    ]);
    const a = evaluarAprobacion(c, REGLA);
    expect(c.ncCriticas).toBe(2);
    expect(a.aprueba).toBe(false);
    expect(a.texto).toContain('NC Críticas');
  });

  it('CP-07: 6 NC Mayores con 93% no aprueba (máximo 5)', () => {
    const c = calcularCumplimiento(respuestas({ c: 39, cp: 6, criticidad: 'M' }));
    const a = evaluarAprobacion(c, REGLA);
    expect(c.ncMayores).toBe(6);
    expect(a.aprueba).toBe(false);
  });

  it('CP-08: exactamente 60% NO aprueba (la regla es > 60, no ≥)', () => {
    const c = calcularCumplimiento(respuestas({ c: 27, it: 18 }));
    expect(c.porcentajeCumplimiento).toBe(60);
    expect(evaluarAprobacion(c, REGLA).aprueba).toBe(false);
  });

  it('CP-09: permiso sanitario por encima de 81% cuando aprueba', () => {
    // 41 C + 4 CP = 43/45 = 95.56%, con 4 NC Mayores (dentro del maximo de 5)
    const c = calcularCumplimiento(respuestas({ c: 41, cp: 4 }));
    expect(c.porcentajeCumplimiento).toBeGreaterThan(81);
    expect(c.ncMayores).toBe(4);
    const a = evaluarAprobacion(c, REGLA);
    expect(a.aprueba).toBe(true);
    expect(a.otorgaPermisoSanitario).toBe(true);
  });

  it('CP-09b: SUPUESTO — 90% pero 9 NC Mayores no aprueba ni otorga permiso', () => {
    // Documenta una decision de diseno, no una regla del archivo fuente.
    // La ficha dice ">81% otorgar Permiso Sanitario" sin condicionarlo a la
    // aprobacion. Asumimos que un establecimiento que NO aprueba la inspeccion
    // tampoco recibe permiso sanitario. Pendiente de confirmar (ambiguedad A-07).
    const c = calcularCumplimiento(respuestas({ c: 36, cp: 9 }));
    expect(c.porcentajeCumplimiento).toBe(90);
    const a = evaluarAprobacion(c, REGLA);
    expect(a.aprueba).toBe(false);
    expect(a.otorgaPermisoSanitario).toBe(false);
  });
});

// =====================================================================
// CP-10 a CP-13 — Motor de riesgo y bordes
// =====================================================================

describe('Motor de riesgo', () => {
  it('CP-10: reproduce el ejemplo del Excel con el factor 6 corregido', () => {
    const { reValor, detalle } = calcularRe([
      ...FACTORES_MANUALES,
      { numero: 3, nombre: 'Cumplimiento BPM', peso: 0.56, puntaje: 1.0, esAutomatico: true },
    ]);
    expect(reValor).toBeCloseTo(1.3931, 4);
    expect(detalle.find((d) => d.numero === 6)!.aporte).toBeCloseTo(0.1864, 4);

    const rt = Number((3 * reValor).toFixed(4));
    expect(rt).toBeCloseTo(4.1793, 4);
    expect(resolverFrecuencia(rt, RANGOS_FRECUENCIA).frecuencia).toBe('Semestral');
  });

  it('CP-11: la precisión no debe alterar la frecuencia (caso RT = 3.6006)', () => {
    // Con numeric(6,2) en `aporte` este caso daba 3.6000 → Anual (incorrecto)
    const { reValor } = calcularRe([
      { numero: 1, nombre: 'F1', peso: 0.16, puntaje: 1.0,  esAutomatico: false },
      { numero: 2, nombre: 'F2', peso: 0.09, puntaje: 1.0,  esAutomatico: false },
      { numero: 3, nombre: 'F3', peso: 0.56, puntaje: 1.0,  esAutomatico: true  },
      { numero: 4, nombre: 'F4', peso: 0.05, puntaje: 1.0,  esAutomatico: false },
      { numero: 5, nombre: 'F5', peso: 0.06, puntaje: 1.67, esAutomatico: false },
      { numero: 6, nombre: 'F6', peso: 0.08, puntaje: 3.0,  esAutomatico: false },
    ]);
    const rt = Number((3 * reValor).toFixed(4));
    expect(rt).toBeGreaterThan(3.6);
    expect(resolverFrecuencia(rt, RANGOS_FRECUENCIA).frecuencia).toBe('Semestral');
  });

  it('CP-12: los bordes de la matriz de frecuencia', () => {
    expect(resolverFrecuencia(3.6,  RANGOS_FRECUENCIA).frecuencia).toBe('Anual');
    expect(resolverFrecuencia(3.61, RANGOS_FRECUENCIA).frecuencia).toBe('Semestral');
    expect(resolverFrecuencia(6.3,  RANGOS_FRECUENCIA).frecuencia).toBe('Semestral');
    expect(resolverFrecuencia(6.31, RANGOS_FRECUENCIA).frecuencia).toBe('Trimestral');
  });

  it('CP-13: RP toma el MAYOR nivel entre las categorías', () => {
    expect(calcularRp([1, 2, 3])).toBe(3);
    expect(calcularRp([1, 1])).toBe(1);
    expect(() => calcularRp([])).toThrow(ErrorMotorRiesgo);
  });

  it('rechaza factores cuyos pesos no suman 1.00', () => {
    expect(() =>
      calcularRe([{ numero: 1, nombre: 'X', peso: 0.5, puntaje: 1, esAutomatico: false }])
    ).toThrow(/suma de pesos/i);
  });
});

// =====================================================================
// CP-14 a CP-15 — Cálculo completo y persistencia
// =====================================================================

describe('Cálculo completo', () => {
  it('CP-14: el factor 3 se alimenta del porcentaje de cumplimiento', () => {
    const r = calcularRiesgo({
      respuestas: respuestas({ c: TOTAL_CRITERIOS }),
      factoresManuales: FACTORES_MANUALES,
      factorAutomatico: FACTOR_AUTO,
      puntajesRpCategorias: [3],
      rangosCalificacion: RANGOS_CALIFICACION,
      rangosFrecuencia: RANGOS_FRECUENCIA,
      reglaAprobacion: REGLA,
      fechaBase: new Date('2026-09-25'),
    });
    // 100% → opción ">80%" → puntaje 1.00 en el factor de peso 0.56
    expect(r.cumplimiento.porcentajeCumplimiento).toBe(100);
    expect(r.reDetalle.find((d) => d.numero === 3)!.puntaje).toBe(1.0);
    expect(r.aprueba).toBe(true);
    expect(r.frecuencia).toBe('Semestral');
  });

  it('CP-15: persistencia — cambiar el valor de CP no altera un cálculo ya hecho', () => {
    const resp = respuestas({ cp: TOTAL_CRITERIOS });
    const antes = calcularCumplimiento(resp);
    expect(antes.porcentajeCumplimiento).toBe(50);

    // El catálogo cambia: CP pasa de 0.5 a 0.9
    const CP_NUEVO: OpcionRespuesta = { ...CP, valor: 0.9 };

    // Las respuestas ya capturadas conservan su opción original (valor congelado)
    const despues = calcularCumplimiento(resp);
    expect(despues.porcentajeCumplimiento).toBe(50);

    // Una evaluación NUEVA sí usa el valor actualizado
    const nuevas = resp.map((r) => ({ ...r, opcion: CP_NUEVO }));
    expect(calcularCumplimiento(nuevas).porcentajeCumplimiento).toBe(90);
  });
});
