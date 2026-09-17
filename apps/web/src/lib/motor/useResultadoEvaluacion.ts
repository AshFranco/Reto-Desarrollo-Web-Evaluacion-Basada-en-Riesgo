import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/db';
import type { CatalogoItemLocal, CatalogoMetaLocal, RespuestaLocal } from '@/lib/db';
import type { EvaluacionDetalle, OpcionRespuestaLocal, RespuestaItemRaw } from '@/lib/types';
import type { ResultadoRiesgo } from '@ebr/risk-engine';
import { useCatalogoMotor } from './useCatalogoMotor';
import { useMotorRiesgo } from './useMotorRiesgo';

/**
 * Convierte las respuestas guardadas en el servidor (RespuestaItemRaw) al
 * formato que espera el motor TS. La nivelCriticidad queda null porque el
 * backend solo devuelve el id numérico de nivel_criticidad sin el código
 * ('C'|'M'|'Me'). El motor sigue calculando % y frecuencia correctamente;
 * los conteos de NC Críticas/Mayores serán 0 en el cliente — el servidor
 * es la autoridad final sobre esos valores.
 */
function convertirRespuestas(
  rawRespuestas: RespuestaItemRaw[],
  opcionPorId: Map<string, OpcionRespuestaLocal>,
): RespuestaLocal[] {
  return rawRespuestas.flatMap(r => {
    const opcion = opcionPorId.get(r.idOpcionRespuesta);
    if (!opcion) return [];
    return [{
      uuidLocal: r.uuidLocal,
      evaluacionUuid: r.idEvaluacion,
      itemId: r.idItemFicha,
      codigoOpcion: opcion.codigo as RespuestaLocal['codigoOpcion'],
      nivelCriticidad: null,
      observacion: r.observacion ?? '',
      capturaEn: 0,
    }];
  });
}

/**
 * Hook compuesto para uso en EjecutarEvaluacion.tsx (Rol 4).
 *
 * Dado el detalle de la evaluación que devuelve el servidor y las opciones
 * de respuesta del catálogo vigente, retorna el ResultadoRiesgo calculado
 * por el motor TS en tiempo real — o null si los datos offline aún no
 * están disponibles en Dexie (primera sesión antes de que el catálogo del
 * motor se haya descargado).
 *
 * Uso:
 *   const resultado = useResultadoEvaluacion(evaluacion, ficha?.opcionesRespuesta ?? []);
 *   // resultado?.cumplimiento.porcentajeCumplimiento
 *   // resultado?.frecuencia
 *   // resultado?.aprueba
 */
export function useResultadoEvaluacion(
  evaluacion: EvaluacionDetalle | undefined,
  opcionesRespuesta: OpcionRespuestaLocal[],
): ResultadoRiesgo | null {
  const entradaCompleta = useCatalogoMotor();

  const [catalogoItems, setCatalogoItems] = useState<CatalogoItemLocal[]>([]);
  const [catalogoMeta, setCatalogoMeta] = useState<CatalogoMetaLocal | null>(null);

  useEffect(() => {
    if (!evaluacion) return;
    const vid = evaluacion.idVersionFicha;
    Promise.all([
      db.catalogo_item.where('versionFichaId').equals(vid).toArray(),
      db.catalogo_meta.get(1),
    ]).then(([items, meta]) => {
      setCatalogoItems(items);
      setCatalogoMeta(meta ?? null);
    });
  }, [evaluacion?.idVersionFicha]);

  const opcionPorId = useMemo(
    () => new Map(opcionesRespuesta.map(o => [o.id, o])),
    [opcionesRespuesta],
  );

  const respuestasLocales = useMemo(
    () => (evaluacion ? convertirRespuestas(evaluacion.respuestas, opcionPorId) : []),
    [evaluacion, opcionPorId],
  );

  return useMotorRiesgo({
    respuestas: respuestasLocales,
    catalogoItems,
    catalogoMeta,
    entradaCompleta: entradaCompleta ?? undefined,
  });
}
