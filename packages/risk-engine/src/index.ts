/**
 * Motor de Evaluación Basada en Riesgo (EBR/BPM)
 *
 * IMPLEMENTACIÓN ÚNICA compartida por el API y la PWA.
 *
 * Este paquete existe para que el cálculo NO se implemente dos veces.
 * El técnico necesita ver el puntaje en tiempo real sin conexión, y el
 * servidor es la autoridad final: ambos importan exactamente este código.
 *
 * REGLA DEL PROYECTO: ningún número del dominio se escribe aquí.
 * Todos los valores (0.5, 0.56, 3.6, 60, 81...) llegan como datos desde
 * la base de datos. Este módulo solo contiene la aritmética.
 *
 * Cadena de cálculo:
 *   Ficha BPM → % cumplimiento → Factor 3 (peso 0.56) → RE
 *   RP = MAX(nivel de riesgo de las categorías que elabora)
 *   RT = RP × RE → nivel de riesgo → frecuencia → próxima inspección
 */

import { Decimal } from 'decimal.js';

// Precisión suficiente para evitar el error de clasificación detectado:
// con 2 decimales en `aporte`, 31 de 12.288 combinaciones caen en la
// frecuencia equivocada (ej. RT 3.6006 → 3.6000 → Anual en vez de Semestral).
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ---------------------------------------------------------------------
// Tipos de entrada (todos provienen del catálogo en base de datos)
// ---------------------------------------------------------------------

export interface OpcionRespuesta {
  id: number;
  codigo: string;              // C | CP | IT | N/A
  valor: number;               // 1.0 | 0.5 | 0.0 | 0.0
  excluyeDelCalculo: boolean;  // true solo en N/A
  generaNc: boolean;           // true en CP e IT
}

export interface Respuesta {
  idItemFicha: number;
  opcion: OpcionRespuesta;
  peso: number;                // peso del criterio, hoy 1.0
  criticidad?: 'C' | 'M' | 'Me' | null;
}

export interface FactorEvaluado {
  numero: number;
  nombre: string;
  peso: number;
  puntaje: number;
  esAutomatico: boolean;
}

export interface OpcionFactor {
  id: number;
  descripcion: string;
  puntaje: number;
  limiteInf?: number | null;
  limiteSup?: number | null;
}

export interface RangoCalificacion {
  limiteInferior: number;
  limiteSuperior: number;
  incluyeInferior: boolean;
  incluyeSuperior: boolean;
  descripcion: string;
  accion: string;
}

export interface RangoFrecuencia {
  id: number;
  limiteInferior: number;
  limiteSuperior: number | null;
  incluyeInferior: boolean;
  incluyeSuperior: boolean;
  nivelRiesgo: string;
  frecuencia: string;
  mesesHastaProxima: number;
}

export interface ReglaAprobacion {
  porcentajeMinimoAprobacion: number;  // 60
  maxNcCriticas: number;               // 1
  maxNcMayores: number;                // 5
  porcentajePermisoSanitario: number;  // 81
}

// ---------------------------------------------------------------------
// Tipos de salida
// ---------------------------------------------------------------------

export interface ResultadoCumplimiento {
  puntosObtenidos: number;
  puntosExcluidosNa: number;
  puntajeTotalPosible: number;
  denominadorEfectivo: number;
  porcentajeCumplimiento: number;
  itemsRespondidos: number;
  itemsNa: number;
  ncCriticas: number;
  ncMayores: number;
  ncMenores: number;
}

export interface AporteFactor {
  numero: number;
  factor: string;
  puntaje: number;
  peso: number;
  aporte: number;
}

export interface ResultadoRiesgo {
  cumplimiento: ResultadoCumplimiento;
  calificacionTexto: string;
  aprueba: boolean;
  otorgaPermisoSanitario: boolean;
  rpValor: number;
  reValor: number;
  reDetalle: AporteFactor[];
  rtValor: number;
  nivelRiesgo: string;
  frecuencia: string;
  fechaProximaInspeccion: Date;
}

export class ErrorMotorRiesgo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorMotorRiesgo';
  }
}

// ---------------------------------------------------------------------
// 1. Porcentaje de cumplimiento
//
// REGLA CLAVE: N/A no vale cero — sale del DENOMINADOR.
//   % = puntos_obtenidos / (total_posible − puntos_excluidos_na)
// Tratarlo como cero penalizaría a la planta por criterios que no le aplican.
// ---------------------------------------------------------------------

export function calcularCumplimiento(respuestas: Respuesta[]): ResultadoCumplimiento {
  if (respuestas.length === 0) {
    throw new ErrorMotorRiesgo('No hay respuestas para calcular');
  }

  let obtenidos = new Decimal(0);
  let excluidos = new Decimal(0);
  let totalPosible = new Decimal(0);
  let denominador = new Decimal(0);
  let itemsNa = 0;
  let ncCriticas = 0;
  let ncMayores = 0;
  let ncMenores = 0;

  for (const r of respuestas) {
    const peso = new Decimal(r.peso);
    totalPosible = totalPosible.plus(peso);

    if (r.opcion.excluyeDelCalculo) {
      excluidos = excluidos.plus(peso);
      itemsNa += 1;
      continue;
    }

    denominador = denominador.plus(peso);
    obtenidos = obtenidos.plus(new Decimal(r.opcion.valor).times(peso));

    if (r.opcion.generaNc) {
      if (r.criticidad === 'C') ncCriticas += 1;
      else if (r.criticidad === 'M') ncMayores += 1;
      else if (r.criticidad === 'Me') ncMenores += 1;
    }
  }

  // Caso extremo: todos los criterios marcados N/A
  if (denominador.isZero()) {
    throw new ErrorMotorRiesgo(
      'Todos los criterios están marcados N/A: no hay denominador para calcular'
    );
  }

  const porcentaje = obtenidos.dividedBy(denominador).times(100);

  return {
    puntosObtenidos: obtenidos.toDecimalPlaces(2).toNumber(),
    puntosExcluidosNa: excluidos.toDecimalPlaces(2).toNumber(),
    puntajeTotalPosible: totalPosible.toDecimalPlaces(2).toNumber(),
    denominadorEfectivo: denominador.toDecimalPlaces(2).toNumber(),
    porcentajeCumplimiento: porcentaje.toDecimalPlaces(2).toNumber(),
    itemsRespondidos: respuestas.length,
    itemsNa,
    ncCriticas,
    ncMayores,
    ncMenores,
  };
}

// ---------------------------------------------------------------------
// 2. Riesgo del Establecimiento (RE) = Σ (puntaje × peso)
//
// Se acumula en precisión completa y se redondea UNA sola vez al final.
// Redondear cada aporte a 2 decimales cambia la frecuencia resultante.
// ---------------------------------------------------------------------

export function calcularRe(factores: FactorEvaluado[]): {
  reValor: number;
  detalle: AporteFactor[];
} {
  if (factores.length === 0) {
    throw new ErrorMotorRiesgo('No hay factores de riesgo para calcular el RE');
  }

  const sumaPesos = factores.reduce(
    (acc, f) => acc.plus(new Decimal(f.peso)),
    new Decimal(0)
  );
  if (sumaPesos.minus(1).abs().greaterThan(0.0001)) {
    throw new ErrorMotorRiesgo(
      `La suma de pesos de los factores es ${sumaPesos.toString()} y debe ser 1.0000`
    );
  }

  let re = new Decimal(0);
  const detalle: AporteFactor[] = [];

  for (const f of factores) {
    const aporte = new Decimal(f.puntaje).times(new Decimal(f.peso));
    re = re.plus(aporte);
    detalle.push({
      numero: f.numero,
      factor: f.nombre,
      puntaje: f.puntaje,
      peso: f.peso,
      aporte: aporte.toDecimalPlaces(4).toNumber(),
    });
  }

  detalle.sort((a, b) => a.numero - b.numero);
  return { reValor: re.toDecimalPlaces(4).toNumber(), detalle };
}

// ---------------------------------------------------------------------
// 3. Riesgo del Producto (RP) = MAX del nivel de las categorías
// ---------------------------------------------------------------------

export function calcularRp(puntajesRp: number[]): number {
  if (puntajesRp.length === 0) {
    throw new ErrorMotorRiesgo(
      'El establecimiento no tiene categorías de alimento con nivel de riesgo asignado'
    );
  }
  return Math.max(...puntajesRp);
}

// ---------------------------------------------------------------------
// 4. Factor automático 3: el % de cumplimiento determina la opción
// ---------------------------------------------------------------------

export function resolverOpcionFactorAutomatico(
  porcentaje: number,
  opciones: OpcionFactor[]
): OpcionFactor {
  const p = new Decimal(porcentaje);
  const encontrada = opciones.find(
    (o) =>
      o.limiteInf != null &&
      o.limiteSup != null &&
      p.greaterThanOrEqualTo(o.limiteInf) &&
      p.lessThanOrEqualTo(o.limiteSup)
  );
  if (!encontrada) {
    throw new ErrorMotorRiesgo(
      `No hay opción de factor automático para el porcentaje ${porcentaje}`
    );
  }
  return encontrada;
}

// ---------------------------------------------------------------------
// 5. Resolución de rangos — los bordes importan
//    1.0–3.6 INCLUYE 3.6 · >3.6–6.3 INCLUYE 6.3
// ---------------------------------------------------------------------

function dentroDeRango(
  valor: Decimal,
  inf: number,
  sup: number | null,
  incInf: boolean,
  incSup: boolean
): boolean {
  const okInf = incInf ? valor.greaterThanOrEqualTo(inf) : valor.greaterThan(inf);
  if (!okInf) return false;
  if (sup == null) return true;
  return incSup ? valor.lessThanOrEqualTo(sup) : valor.lessThan(sup);
}

export function resolverFrecuencia(
  rtValor: number,
  rangos: RangoFrecuencia[]
): RangoFrecuencia {
  const rt = new Decimal(rtValor);
  const r = rangos.find((x) =>
    dentroDeRango(rt, x.limiteInferior, x.limiteSuperior, x.incluyeInferior, x.incluyeSuperior)
  );
  if (!r) {
    throw new ErrorMotorRiesgo(`RT ${rtValor} fuera de los rangos de frecuencia definidos`);
  }
  return r;
}

export function resolverCalificacion(
  porcentaje: number,
  rangos: RangoCalificacion[]
): RangoCalificacion {
  const p = new Decimal(porcentaje);
  const r = rangos.find((x) =>
    dentroDeRango(p, x.limiteInferior, x.limiteSuperior, x.incluyeInferior, x.incluyeSuperior)
  );
  if (!r) {
    throw new ErrorMotorRiesgo(`Porcentaje ${porcentaje} fuera de los rangos de calificación`);
  }
  return r;
}

// ---------------------------------------------------------------------
// 6. Regla de aprobación
//
//   SI  NC_Críticas > max        → no aprueba, corregir inmediatamente
//   SI  % > mínimo Y NC_May ≤ max → aprueba
//   EN OTRO CASO                  → no aprueba, plan de corrección
// ---------------------------------------------------------------------

/**
 * SUPUESTO A-07 (pendiente de confirmar con la DIGEMAPS):
 * la ficha dice ">81% otorgar Permiso Sanitario" sin condicionarlo a la
 * aprobación de la inspección. Aquí asumimos que un establecimiento que NO
 * aprueba tampoco recibe permiso sanitario. Si la DIGEMAPS indica que son
 * reglas independientes, se desacopla eliminando el `otorgaPermisoSanitario:
 * false` de las dos ramas de rechazo.
 */
export function evaluarAprobacion(
  c: ResultadoCumplimiento,
  regla: ReglaAprobacion
): { aprueba: boolean; texto: string; otorgaPermisoSanitario: boolean } {
  const otorgaPermisoSanitario = c.porcentajeCumplimiento > regla.porcentajePermisoSanitario;

  if (c.ncCriticas > regla.maxNcCriticas) {
    return {
      aprueba: false,
      texto: 'No aprueba la inspección, corregir NC Críticas inmediatamente',
      otorgaPermisoSanitario: false,
    };
  }
  if (
    c.porcentajeCumplimiento > regla.porcentajeMinimoAprobacion &&
    c.ncMayores <= regla.maxNcMayores
  ) {
    return { aprueba: true, texto: 'Aprueba la inspección', otorgaPermisoSanitario };
  }
  return {
    aprueba: false,
    texto: 'No se aprueba la inspección, presentar plan de corrección de NC',
    otorgaPermisoSanitario: false,
  };
}

// ---------------------------------------------------------------------
// 7. Cálculo completo
// ---------------------------------------------------------------------

export interface EntradaCalculo {
  respuestas: Respuesta[];
  factoresManuales: FactorEvaluado[];
  factorAutomatico: { numero: number; nombre: string; peso: number; opciones: OpcionFactor[] };
  puntajesRpCategorias: number[];
  rangosCalificacion: RangoCalificacion[];
  rangosFrecuencia: RangoFrecuencia[];
  reglaAprobacion: ReglaAprobacion;
  fechaBase?: Date;
}

export function calcularRiesgo(e: EntradaCalculo): ResultadoRiesgo {
  const cumplimiento = calcularCumplimiento(e.respuestas);

  // El factor 3 se deriva del cumplimiento; no se digita
  const opcionAuto = resolverOpcionFactorAutomatico(
    cumplimiento.porcentajeCumplimiento,
    e.factorAutomatico.opciones
  );

  const factores: FactorEvaluado[] = [
    ...e.factoresManuales,
    {
      numero: e.factorAutomatico.numero,
      nombre: e.factorAutomatico.nombre,
      peso: e.factorAutomatico.peso,
      puntaje: opcionAuto.puntaje,
      esAutomatico: true,
    },
  ];

  const { reValor, detalle } = calcularRe(factores);
  const rpValor = calcularRp(e.puntajesRpCategorias);

  const rtValor = new Decimal(rpValor).times(new Decimal(reValor)).toDecimalPlaces(4).toNumber();

  const rangoFrec = resolverFrecuencia(rtValor, e.rangosFrecuencia);
  const calif = resolverCalificacion(cumplimiento.porcentajeCumplimiento, e.rangosCalificacion);
  const aprob = evaluarAprobacion(cumplimiento, e.reglaAprobacion);

  const base = e.fechaBase ?? new Date();
  const proxima = new Date(base);
  proxima.setMonth(proxima.getMonth() + rangoFrec.mesesHastaProxima);

  return {
    cumplimiento,
    calificacionTexto: aprob.texto,
    aprueba: aprob.aprueba,
    otorgaPermisoSanitario: aprob.otorgaPermisoSanitario,
    rpValor,
    reValor,
    reDetalle: detalle,
    rtValor,
    nivelRiesgo: rangoFrec.nivelRiesgo,
    frecuencia: rangoFrec.frecuencia,
    fechaProximaInspeccion: proxima,
  };
}

